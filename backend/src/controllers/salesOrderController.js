const prisma = require("../config/prisma");
const { Prisma } = require("@prisma/client");

// =========================================================
// Generate Sales Order Number
// =========================================================

const generateOrderNumber = async () => {
  const year = new Date().getFullYear();

  const count = await prisma.salesOrder.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  return `SO-${year}-${String(count + 1).padStart(4, "0")}`;
};

// =========================================================
// CREATE SALES ORDER FROM ACCEPTED QUOTATION
// POST /api/sales-orders/from-quotation/:quotationId
// ADMIN ONLY
// =========================================================

const createSalesOrderFromQuotation = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Only Admin can create Sales Orders",
      });
    }

    const quotationId = Number(req.params.quotationId);

    if (!Number.isInteger(quotationId)) {
      return res.status(400).json({
        message: "Invalid quotation ID",
      });
    }

    const quotation = await prisma.quotation.findUnique({
      where: {
        id: quotationId,
      },

      include: {
        customer: true,

        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!quotation) {
      return res.status(404).json({
        message: "Quotation not found",
      });
    }

    // Only accepted quotations can become Sales Orders
    if (quotation.status !== "ACCEPTED") {
      return res.status(400).json({
        message:
          "Only an ACCEPTED quotation can be converted to Sales Order",
      });
    }

    // Prevent duplicate Sales Order
    const existingOrder = await prisma.salesOrder.findUnique({
      where: {
        quotationId,
      },
    });

    if (existingOrder) {
      return res.status(409).json({
        message: "Sales Order already exists for this quotation",
        salesOrderId: existingOrder.id,
        orderNumber: existingOrder.orderNumber,
      });
    }

    if (!quotation.items.length) {
      return res.status(400).json({
        message: "Quotation has no items",
      });
    }

    const orderNumber = await generateOrderNumber();

    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber,
        quotationId: quotation.id,
        customerId: quotation.customerId,
        createdById: req.user.id,
        orderDate: new Date(),

        // Quotation grand total becomes Sales Order total
        totalAmount: quotation.grandTotal,

        // Newly created order waits for Admin to place it
        status: "PENDING",

        items: {
          create: quotation.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },

      include: {
        customer: true,

        quotation: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },

        items: {
          include: {
            product: {
              include: {
                inventory: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      message: "Sales Order created successfully",
      salesOrder,
    });
  } catch (error) {
    console.error("Create Sales Order Error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Sales Order already exists for this quotation",
      });
    }

    return res.status(500).json({
      message: "Failed to create Sales Order",
    });
  }
};

// =========================================================
// GET SALES ORDERS
// GET /api/sales-orders
//
// ADMIN / SALES -> all orders
// CUSTOMER -> own orders only
// =========================================================

const getSalesOrders = async (req, res) => {
  try {
    const where = {};

    if (req.user.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: {
          userId: req.user.id,
        },
      });

      if (!customer) {
        return res.status(404).json({
          message: "Customer profile not found",
        });
      }

      where.customerId = customer.id;
    }

    const salesOrders = await prisma.salesOrder.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      include: {
        customer: true,

        quotation: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },

        items: {
          include: {
            product: {
              include: {
                inventory: true,
              },
            },
          },
        },

        dispatches: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    return res.json(salesOrders);
  } catch (error) {
    console.error("Get Sales Orders Error:", error);

    return res.status(500).json({
      message: "Failed to fetch Sales Orders",
    });
  }
};

// =========================================================
// GET SALES ORDER BY ID
// GET /api/sales-orders/:id
//
// ADMIN / SALES -> any order
// CUSTOMER -> own order only
// =========================================================

const getSalesOrderById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: "Invalid Sales Order ID",
      });
    }

    const salesOrder = await prisma.salesOrder.findUnique({
      where: {
        id,
      },

      include: {
        customer: true,

        quotation: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },

        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },

        items: {
          include: {
            product: {
              include: {
                inventory: true,
              },
            },
          },
        },

        dispatches: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!salesOrder) {
      return res.status(404).json({
        message: "Sales Order not found",
      });
    }

    // Customer can only access their own orders
    if (req.user.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: {
          userId: req.user.id,
        },
      });

      if (!customer || salesOrder.customerId !== customer.id) {
        return res.status(403).json({
          message: "You are not authorized to view this Sales Order",
        });
      }
    }

    return res.json(salesOrder);
  } catch (error) {
    console.error("Get Sales Order Error:", error);

    return res.status(500).json({
      message: "Failed to fetch Sales Order",
    });
  }
};

// =========================================================
// PLACE SALES ORDER
//
// POST /api/sales-orders/:id/place
// ADMIN ONLY
//
// PENDING
//    ↓
// Inventory check
//    ↓
// Inventory reservation
//    ↓
// AWAITING_CUSTOMER_CONFIRMATION
// =========================================================

const placeSalesOrder = async (req, res) => {
  const salesOrderId = Number(req.params.id);

  if (!Number.isInteger(salesOrderId)) {
    return res.status(400).json({
      message: "Invalid Sales Order ID",
    });
  }

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      message: "Only Admin can place Sales Orders",
    });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const salesOrder = await tx.salesOrder.findUnique({
          where: {
            id: salesOrderId,
          },

          include: {
            customer: true,
            items: true,
          },
        });

        if (!salesOrder) {
          throw new Error("SALES_ORDER_NOT_FOUND");
        }

        if (salesOrder.status !== "PENDING") {
          throw new Error("SALES_ORDER_NOT_PENDING");
        }

        if (!salesOrder.items.length) {
          throw new Error("ORDER_HAS_NO_ITEMS");
        }

        // ---------------------------------------------
        // Check and reserve every product
        // ---------------------------------------------

        for (const item of salesOrder.items) {
          /*
           * FOR UPDATE locks the inventory row.
           *
           * This prevents two simultaneous orders from
           * reserving the same available stock.
           */
          const inventoryRows = await tx.$queryRaw`
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

          const inventory = inventoryRows[0];

          const availableQuantity =
            inventory.physicalQuantity -
            inventory.reservedQuantity;

          if (availableQuantity < item.quantity) {
            throw new Error(
              `INSUFFICIENT_STOCK:${item.productId}:${availableQuantity}:${item.quantity}`
            );
          }

          // Reserve inventory
          await tx.inventory.update({
            where: {
              id: inventory.id,
            },

            data: {
              reservedQuantity: {
                increment: item.quantity,
              },
            },
          });
        }

        // ---------------------------------------------
        // Change status
        // ---------------------------------------------

        const updatedOrder = await tx.salesOrder.update({
          where: {
            id: salesOrderId,
          },

          data: {
            status: "AWAITING_CUSTOMER_CONFIRMATION",
          },

          include: {
            customer: true,

            quotation: {
              include: {
                items: {
                  include: {
                    product: true,
                  },
                },
              },
            },

            items: {
              include: {
                product: {
                  include: {
                    inventory: true,
                  },
                },
              },
            },
          },
        });

        return updatedOrder;
      },

      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.json({
      message:
        "Sales Order placed successfully. Inventory reserved and order sent to customer for confirmation.",
      salesOrder: result,
    });
  } catch (error) {
    if (
      ![
        "SALES_ORDER_NOT_FOUND",
        "SALES_ORDER_NOT_PENDING",
        "ORDER_HAS_NO_ITEMS",
      ].includes(error.message) &&
      !error.message?.startsWith("INVENTORY_NOT_FOUND") &&
      !error.message?.startsWith("INSUFFICIENT_STOCK") &&
      error.code !== "P2034" &&
      !error.message?.includes("could not serialize access")
    ) {
      console.error("Place Sales Order Error:", error);
    }
    if (error.message === "SALES_ORDER_NOT_FOUND") {
      return res.status(404).json({
        message: "Sales Order not found",
      });
    }

    if (error.message === "SALES_ORDER_NOT_PENDING") {
      return res.status(400).json({
        message: "Only PENDING Sales Orders can be placed",
      });
    }

    if (error.message === "ORDER_HAS_NO_ITEMS") {
      return res.status(400).json({
        message: "Sales Order has no items",
      });
    }

    if (error.message.startsWith("INVENTORY_NOT_FOUND")) {
      return res.status(400).json({
        message:
          "Inventory record not found for one of the products",
      });
    }

    if (error.message.startsWith("INSUFFICIENT_STOCK")) {
      const [, productId, available, required] =
        error.message.split(":");

      return res.status(409).json({
        message: "Insufficient inventory",
        productId: Number(productId),
        availableQuantity: Number(available),
        requestedQuantity: Number(required),
      });
    }

    if (
      error.code === "P2034" ||
      error.message?.includes("could not serialize access")
    ) {
      return res.status(409).json({
        message:
          "Inventory changed simultaneously. Please retry placing the order.",
      });
    }

    return res.status(500).json({
      message: "Failed to place Sales Order",
    });
  }
};

// =========================================================
// CUSTOMER CONFIRM SALES ORDER
//
// POST /api/sales-orders/:id/confirm
// CUSTOMER ONLY
//
// AWAITING_CUSTOMER_CONFIRMATION
//          ↓
//       CONFIRMED
// =========================================================

const confirmSalesOrder = async (req, res) => {
  const salesOrderId = Number(req.params.id);

  if (!Number.isInteger(salesOrderId)) {
    return res.status(400).json({
      message: "Invalid Sales Order ID",
    });
  }

  if (req.user.role !== "CUSTOMER") {
    return res.status(403).json({
      message: "Only the customer can confirm this Sales Order",
    });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer profile not found",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const salesOrder = await tx.salesOrder.findUnique({
        where: {
          id: salesOrderId,
        },
      });

      if (!salesOrder) {
        throw new Error("SALES_ORDER_NOT_FOUND");
      }

      if (salesOrder.customerId !== customer.id) {
        throw new Error("UNAUTHORIZED_ORDER");
      }

      if (
        salesOrder.status !==
        "AWAITING_CUSTOMER_CONFIRMATION"
      ) {
        throw new Error("ORDER_NOT_AWAITING_CONFIRMATION");
      }

      return tx.salesOrder.update({
        where: {
          id: salesOrderId,
        },

        data: {
          status: "CONFIRMED",
        },

        include: {
          customer: true,

          quotation: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },

          items: {
            include: {
              product: {
                include: {
                  inventory: true,
                },
              },
            },
          },
        },
      });
    });

    return res.json({
      message: "Sales Order confirmed successfully",
      salesOrder: result,
    });
  } catch (error) {
    console.error(
      "Customer Confirm Sales Order Error:",
      error
    );

    if (error.message === "SALES_ORDER_NOT_FOUND") {
      return res.status(404).json({
        message: "Sales Order not found",
      });
    }

    if (error.message === "UNAUTHORIZED_ORDER") {
      return res.status(403).json({
        message:
          "You are not authorized to confirm this Sales Order",
      });
    }

    if (
      error.message ===
      "ORDER_NOT_AWAITING_CONFIRMATION"
    ) {
      return res.status(400).json({
        message:
          "This Sales Order is not waiting for customer confirmation",
      });
    }

    return res.status(500).json({
      message: "Failed to confirm Sales Order",
    });
  }
};

// =========================================================
// CANCEL SALES ORDER
//
// ADMIN:
//   PENDING
//   AWAITING_CUSTOMER_CONFIRMATION
//   CONFIRMED
//
// CUSTOMER:
//   AWAITING_CUSTOMER_CONFIRMATION only
//
// Reserved stock is released when applicable.
// =========================================================

const cancelSalesOrder = async (req, res) => {
  const salesOrderId = Number(req.params.id);

  if (!Number.isInteger(salesOrderId)) {
    return res.status(400).json({
      message: "Invalid Sales Order ID",
    });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const salesOrder = await tx.salesOrder.findUnique({
          where: {
            id: salesOrderId,
          },

          include: {
            items: true,
          },
        });

        if (!salesOrder) {
          throw new Error("SALES_ORDER_NOT_FOUND");
        }

        // ---------------------------------------------
        // CUSTOMER
        // ---------------------------------------------

        if (req.user.role === "CUSTOMER") {
          const customer = await tx.customer.findUnique({
            where: {
              userId: req.user.id,
            },
          });

          if (
            !customer ||
            salesOrder.customerId !== customer.id
          ) {
            throw new Error("UNAUTHORIZED_ORDER");
          }

          if (
            salesOrder.status !==
            "AWAITING_CUSTOMER_CONFIRMATION"
          ) {
            throw new Error("CUSTOMER_CANNOT_CANCEL");
          }
        }

        // ---------------------------------------------
        // SALES
        // ---------------------------------------------

        if (req.user.role === "SALES") {
          throw new Error("SALES_CANNOT_CANCEL");
        }

        // ---------------------------------------------
        // ADMIN
        // ---------------------------------------------

        if (req.user.role === "ADMIN") {
          if (
            ![
              "PENDING",
              "AWAITING_CUSTOMER_CONFIRMATION",
              "CONFIRMED",
            ].includes(salesOrder.status)
          ) {
            throw new Error("ORDER_CANNOT_BE_CANCELLED");
          }
        }

        // ---------------------------------------------
        // Release reserved inventory
        // ---------------------------------------------

        const reservationExists =
          salesOrder.status ===
          "AWAITING_CUSTOMER_CONFIRMATION" ||
          salesOrder.status === "CONFIRMED";

        if (reservationExists) {
          for (const item of salesOrder.items) {
            const inventoryRows = await tx.$queryRaw`
              SELECT
                id,
                "productId",
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

            const inventory = inventoryRows[0];

            if (
              inventory.reservedQuantity <
              item.quantity
            ) {
              throw new Error(
                `INVALID_RESERVATION:${item.productId}`
              );
            }

            await tx.inventory.update({
              where: {
                id: inventory.id,
              },

              data: {
                reservedQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          }
        }

        return tx.salesOrder.update({
          where: {
            id: salesOrderId,
          },

          data: {
            status: "CANCELLED",
          },

          include: {
            customer: true,

            items: {
              include: {
                product: {
                  include: {
                    inventory: true,
                  },
                },
              },
            },
          },
        });
      },

      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.json({
      message: "Sales Order cancelled successfully",
      salesOrder: result,
    });
  } catch (error) {
    console.error(
      "Cancel Sales Order Error:",
      error
    );

    if (error.message === "SALES_ORDER_NOT_FOUND") {
      return res.status(404).json({
        message: "Sales Order not found",
      });
    }

    if (error.message === "UNAUTHORIZED_ORDER") {
      return res.status(403).json({
        message:
          "You are not authorized to cancel this Sales Order",
      });
    }

    if (error.message === "CUSTOMER_CANNOT_CANCEL") {
      return res.status(400).json({
        message:
          "Customer can cancel only an order waiting for confirmation",
      });
    }

    if (error.message === "ORDER_CANNOT_BE_CANCELLED") {
      return res.status(400).json({
        message:
          "This Sales Order cannot be cancelled at its current status",
      });
    }

    if (error.message === "SALES_CANNOT_CANCEL") {
      return res.status(403).json({
        message:
          "Sales users cannot cancel Sales Orders",
      });
    }

    if (error.message.startsWith("INVENTORY_NOT_FOUND")) {
      return res.status(400).json({
        message: "Inventory record not found",
      });
    }

    if (error.message.startsWith("INVALID_RESERVATION")) {
      return res.status(409).json({
        message:
          "Reserved inventory is inconsistent for this order",
      });
    }

    return res.status(500).json({
      message: "Failed to cancel Sales Order",
    });
  }
};

// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  createSalesOrderFromQuotation,
  getSalesOrders,
  getSalesOrderById,
  placeSalesOrder,
  confirmSalesOrder,
  cancelSalesOrder,
};