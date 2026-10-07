const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");

// =========================================================
// GENERATE DISPATCH NUMBER
// =========================================================

const generateDispatchNumber = async (tx) => {
  const year = new Date().getFullYear();

  const count = await tx.dispatch.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  return `DSP-${year}-${String(count + 1).padStart(4, "0")}`;
};

// =========================================================
// CREATE DISPATCH
//
// POST /api/sales-orders/:id/dispatch
//
// ADMIN ONLY
//
// CONFIRMED
//     ↓
// Inventory physical - quantity
// Inventory reserved - quantity
//     ↓
// DISPATCHED
// =========================================================

const createDispatch = async (req, res) => {
  const salesOrderId = Number(req.params.id);

  if (!Number.isInteger(salesOrderId)) {
    return res.status(400).json({
      message: "Invalid Sales Order ID",
    });
  }

  // Defense in depth
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "Only Admin can create dispatches",
    });
  }

  const {
    vehicleNumber,
    driverName,
    items,
  } = req.body;

  if (
    !vehicleNumber ||
    !vehicleNumber.trim() ||
    !driverName ||
    !driverName.trim() ||
    !Array.isArray(items) ||
    !items.length
  ) {
    return res.status(400).json({
      message:
        "vehicleNumber, driverName and items are required",
    });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // =================================================
        // GET SALES ORDER
        // =================================================

        const salesOrder =
          await tx.salesOrder.findUnique({
            where: {
              id: salesOrderId,
            },

            include: {
              items: true,

              dispatches: true,
            },
          });

        if (!salesOrder) {
          throw new Error(
            "SALES_ORDER_NOT_FOUND"
          );
        }

        // =================================================
        // ORDER MUST BE CONFIRMED
        // =================================================

        if (salesOrder.status !== "CONFIRMED") {
          throw new Error(
            "ORDER_NOT_CONFIRMED"
          );
        }

        // =================================================
        // PREVENT DUPLICATE DISPATCH
        // =================================================

        if (salesOrder.dispatches.length > 0) {
          throw new Error(
            "DISPATCH_ALREADY_EXISTS"
          );
        }

        // =================================================
        // BUILD ORDER ITEM MAP
        // =================================================

        const orderItems = new Map(
          salesOrder.items.map((item) => [
            item.productId,
            item.quantity,
          ])
        );

        // =================================================
        // PREVENT DUPLICATE PRODUCT ENTRIES
        // =================================================

        const seenProducts = new Set();

        const dispatchItems = [];

        // =================================================
        // VALIDATE DISPATCH ITEMS
        // =================================================

        for (const item of items) {
          const productId = Number(
            item.productId
          );

          const quantity = Number(
            item.quantity
          );

          if (
            !Number.isInteger(productId) ||
            !Number.isInteger(quantity) ||
            quantity <= 0
          ) {
            throw new Error(
              "INVALID_DISPATCH_ITEM"
            );
          }

          if (seenProducts.has(productId)) {
            throw new Error(
              `DUPLICATE_DISPATCH_PRODUCT:${productId}`
            );
          }

          seenProducts.add(productId);

          const orderedQuantity =
            orderItems.get(productId);

          if (
            orderedQuantity === undefined
          ) {
            throw new Error(
              `PRODUCT_NOT_IN_ORDER:${productId}`
            );
          }

          // We are doing one complete dispatch.
          if (
            quantity !== orderedQuantity
          ) {
            throw new Error(
              `DISPATCH_QUANTITY_MISMATCH:${productId}:${orderedQuantity}:${quantity}`
            );
          }

          dispatchItems.push({
            productId,
            quantity,
          });
        }

        // =================================================
        // MAKE SURE ALL ORDER ITEMS ARE INCLUDED
        // =================================================

        if (
          dispatchItems.length !==
          salesOrder.items.length
        ) {
          throw new Error(
            "INCOMPLETE_DISPATCH"
          );
        }

        // =================================================
        // LOCK AND UPDATE INVENTORY
        // =================================================

        for (const item of dispatchItems) {
          const inventoryRows =
            await tx.$queryRaw`
              SELECT
                id,
                "productId",
                "physicalQuantity",
                "reservedQuantity"
              FROM "Inventory"
              WHERE "productId" = ${item.productId}
              FOR UPDATE
            `;

          if (!inventoryRows.length) {
            throw new Error(
              `INVENTORY_NOT_FOUND:${item.productId}`
            );
          }

          const inventory =
            inventoryRows[0];

          // -------------------------------------------------
          // Reserved stock must be enough
          // -------------------------------------------------

          if (
            Number(
              inventory.reservedQuantity
            ) < item.quantity
          ) {
            throw new Error(
              `INSUFFICIENT_RESERVED:${item.productId}:${inventory.reservedQuantity}:${item.quantity}`
            );
          }

          // -------------------------------------------------
          // Physical stock must be enough
          // -------------------------------------------------

          if (
            Number(
              inventory.physicalQuantity
            ) < item.quantity
          ) {
            throw new Error(
              `INSUFFICIENT_PHYSICAL:${item.productId}:${inventory.physicalQuantity}:${item.quantity}`
            );
          }

          // -------------------------------------------------
          // Actual stock movement
          // -------------------------------------------------

          await tx.inventory.update({
            where: {
              id: inventory.id,
            },

            data: {
              physicalQuantity: {
                decrement:
                  item.quantity,
              },

              reservedQuantity: {
                decrement:
                  item.quantity,
              },
            },
          });
        }

        // =================================================
        // GENERATE DISPATCH NUMBER
        // =================================================

        const dispatchNumber =
          await generateDispatchNumber(tx);

        // =================================================
        // CREATE DISPATCH
        // =================================================

        const dispatch =
          await tx.dispatch.create({
            data: {
              dispatchNumber,

              salesOrderId,

              dispatchDate:
                new Date(),

              vehicleNumber:
                vehicleNumber.trim(),

              driverName:
                driverName.trim(),

              items: {
                create:
                  dispatchItems,
              },
            },

            include: {
              items: {
                include: {
                  product: true,
                },
              },

              salesOrder: {
                include: {
                  customer: true,
                },
              },
            },
          });

        // =================================================
        // UPDATE SALES ORDER
        // =================================================

        await tx.salesOrder.update({
          where: {
            id: salesOrderId,
          },

          data: {
            status: "DISPATCHED",
          },
        });

        return dispatch;
      },

      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.status(201).json({
      message:
        "Dispatch created successfully",
      dispatch: result,
    });
  } catch (error) {
    console.error(
      "Create Dispatch Error:",
      error
    );

    if (
      error.message ===
      "SALES_ORDER_NOT_FOUND"
    ) {
      return res.status(404).json({
        message:
          "Sales Order not found",
      });
    }

    if (
      error.message ===
      "ORDER_NOT_CONFIRMED"
    ) {
      return res.status(400).json({
        message:
          "Only a CONFIRMED Sales Order can be dispatched",
      });
    }

    if (
      error.message ===
      "DISPATCH_ALREADY_EXISTS"
    ) {
      return res.status(409).json({
        message:
          "This Sales Order has already been dispatched",
      });
    }

    if (
      error.message ===
      "INVALID_DISPATCH_ITEM"
    ) {
      return res.status(400).json({
        message:
          "Invalid dispatch item",
      });
    }

    if (
      error.message ===
      "INCOMPLETE_DISPATCH"
    ) {
      return res.status(400).json({
        message:
          "All Sales Order items must be included in the dispatch",
      });
    }

    if (
      error.message.startsWith(
        "DUPLICATE_DISPATCH_PRODUCT"
      )
    ) {
      return res.status(400).json({
        message:
          "A product cannot be added twice to the same dispatch",
      });
    }

    if (
      error.message.startsWith(
        "PRODUCT_NOT_IN_ORDER"
      )
    ) {
      return res.status(400).json({
        message:
          "Product is not part of this Sales Order",
      });
    }

    if (
      error.message.startsWith(
        "DISPATCH_QUANTITY_MISMATCH"
      )
    ) {
      const [
        ,
        productId,
        ordered,
        requested,
      ] =
        error.message.split(":");

      return res.status(400).json({
        message:
          "Dispatch quantity must match the ordered quantity",
        productId:
          Number(productId),
        orderedQuantity:
          Number(ordered),
        requestedQuantity:
          Number(requested),
      });
    }

    if (
      error.message.startsWith(
        "INVENTORY_NOT_FOUND"
      )
    ) {
      return res.status(400).json({
        message:
          "Inventory record not found for a product",
      });
    }

    if (
      error.message.startsWith(
        "INSUFFICIENT_RESERVED"
      )
    ) {
      return res.status(409).json({
        message:
          "Reserved inventory is insufficient for dispatch",
      });
    }

    if (
      error.message.startsWith(
        "INSUFFICIENT_PHYSICAL"
      )
    ) {
      return res.status(409).json({
        message:
          "Physical inventory is insufficient for dispatch",
      });
    }

    if (
      error.code === "P2034" ||
      error.message?.includes(
        "could not serialize access"
      )
    ) {
      return res.status(409).json({
        message:
          "Inventory changed simultaneously. Please retry the dispatch.",
      });
    }

    return res.status(500).json({
      message:
        "Failed to create dispatch",
    });
  }
};

// =========================================================
// GET ALL DISPATCHES
//
// GET /api/dispatches
// =========================================================

const getDispatches = async (
  req,
  res
) => {
  try {
    const dispatches =
      await prisma.dispatch.findMany({
        orderBy: {
          createdAt: "desc",
        },

        include: {
          salesOrder: {
            include: {
              customer: true,
            },
          },

          items: {
            include: {
              product: true,
            },
          },
        },
      });

    return res.json(dispatches);
  } catch (error) {
    console.error(
      "Get Dispatches Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch dispatches",
    });
  }
};

// =========================================================
// GET DISPATCH BY ID
//
// GET /api/dispatches/:id
// =========================================================

const getDispatchById = async (
  req,
  res
) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      message:
        "Invalid dispatch ID",
    });
  }

  try {
    const dispatch =
      await prisma.dispatch.findUnique({
        where: {
          id,
        },

        include: {
          salesOrder: {
            include: {
              customer: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          },

          items: {
            include: {
              product: true,
            },
          },
        },
      });

    if (!dispatch) {
      return res.status(404).json({
        message:
          "Dispatch not found",
      });
    }

    return res.json(dispatch);
  } catch (error) {
    console.error(
      "Get Dispatch Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch dispatch",
    });
  }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  createDispatch,
  getDispatches,
  getDispatchById,
};