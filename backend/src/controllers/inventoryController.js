const prisma = require("../config/prisma");

// Get all inventory with product information
const getInventory = async (req, res, next) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        product: true,
      },
      orderBy: {
        product: {
          productName: "asc",
        },
      },
    });

    const result = inventory.map((item) => ({
      id: item.id,
      productId: item.productId,
      productCode: item.product.productCode,
      productName: item.product.productName,
      category: item.product.category,
      unit: item.product.unit,
      basePrice: item.product.basePrice,
      physicalQuantity: item.physicalQuantity,
      reservedQuantity: item.reservedQuantity,
      availableQuantity:
        item.physicalQuantity - item.reservedQuantity,
    }));

    res.json({
      inventory: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get inventory for one product
const getInventoryByProduct = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);

    if (Number.isNaN(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const inventory = await prisma.inventory.findUnique({
      where: {
        productId,
      },
      include: {
        product: true,
      },
    });

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory record not found",
      });
    }

    res.json({
      inventory: {
        id: inventory.id,
        productId: inventory.productId,
        productCode: inventory.product.productCode,
        productName: inventory.product.productName,
        category: inventory.product.category,
        unit: inventory.product.unit,
        basePrice: inventory.product.basePrice,
        physicalQuantity: inventory.physicalQuantity,
        reservedQuantity: inventory.reservedQuantity,
        availableQuantity:
          inventory.physicalQuantity -
          inventory.reservedQuantity,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update physical stock
const updateStock = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    const { physicalQuantity } = req.body;

    if (Number.isNaN(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (
      physicalQuantity === undefined ||
      !Number.isInteger(Number(physicalQuantity)) ||
      Number(physicalQuantity) < 0
    ) {
      return res.status(400).json({
        message: "physicalQuantity must be a non-negative integer",
      });
    }

    const inventory = await prisma.inventory.findUnique({
      where: {
        productId,
      },
    });

    if (!inventory) {
      return res.status(404).json({
        message: "Inventory record not found",
      });
    }

    if (Number(physicalQuantity) < inventory.reservedQuantity) {
      return res.status(400).json({
        message:
          "Physical quantity cannot be less than reserved quantity",
      });
    }

    const updatedInventory = await prisma.inventory.update({
      where: {
        productId,
      },
      data: {
        physicalQuantity: Number(physicalQuantity),
      },
      include: {
        product: true,
      },
    });

    res.json({
      message: "Stock updated successfully",
      inventory: {
        ...updatedInventory,
        availableQuantity:
          updatedInventory.physicalQuantity -
          updatedInventory.reservedQuantity,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Reserve stock
const reserveStock = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    const { quantity } = req.body;

    if (Number.isNaN(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (
      quantity === undefined ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      return res.status(400).json({
        message: "quantity must be a positive integer",
      });
    }

    const reserveQuantity = Number(quantity);

    const updatedInventory = await prisma.$transaction(
      async (tx) => {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId,
          },
        });

        if (!inventory) {
          throw new Error("INVENTORY_NOT_FOUND");
        }

        const availableQuantity =
          inventory.physicalQuantity -
          inventory.reservedQuantity;

        if (reserveQuantity > availableQuantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        return tx.inventory.update({
          where: {
            productId,
          },
          data: {
            reservedQuantity: {
              increment: reserveQuantity,
            },
          },
          include: {
            product: true,
          },
        });
      }
    );

    res.json({
      message: "Stock reserved successfully",
      inventory: {
        ...updatedInventory,
        availableQuantity:
          updatedInventory.physicalQuantity -
          updatedInventory.reservedQuantity,
      },
    });
  } catch (error) {
    if (error.message === "INVENTORY_NOT_FOUND") {
      return res.status(404).json({
        message: "Inventory record not found",
      });
    }

    if (error.message === "INSUFFICIENT_STOCK") {
      return res.status(409).json({
        message: "Insufficient available stock",
      });
    }

    next(error);
  }
};

// Release reserved stock
const releaseStock = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    const { quantity } = req.body;

    if (Number.isNaN(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    if (
      quantity === undefined ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      return res.status(400).json({
        message: "quantity must be a positive integer",
      });
    }

    const releaseQuantity = Number(quantity);

    const updatedInventory = await prisma.$transaction(
      async (tx) => {
        const inventory = await tx.inventory.findUnique({
          where: {
            productId,
          },
        });

        if (!inventory) {
          throw new Error("INVENTORY_NOT_FOUND");
        }

        if (releaseQuantity > inventory.reservedQuantity) {
          throw new Error("INVALID_RELEASE");
        }

        return tx.inventory.update({
          where: {
            productId,
          },
          data: {
            reservedQuantity: {
              decrement: releaseQuantity,
            },
          },
          include: {
            product: true,
          },
        });
      }
    );

    res.json({
      message: "Reserved stock released successfully",
      inventory: {
        ...updatedInventory,
        availableQuantity:
          updatedInventory.physicalQuantity -
          updatedInventory.reservedQuantity,
      },
    });
  } catch (error) {
    if (error.message === "INVENTORY_NOT_FOUND") {
      return res.status(404).json({
        message: "Inventory record not found",
      });
    }

    if (error.message === "INVALID_RELEASE") {
      return res.status(400).json({
        message:
          "Cannot release more stock than currently reserved",
      });
    }

    next(error);
  }
};

module.exports = {
  getInventory,
  getInventoryByProduct,
  updateStock,
  reserveStock,
  releaseStock,
};