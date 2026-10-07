const prisma = require("../config/prisma");

const createProduct = async (req, res, next) => {
  try {
    const {
      productCode,
      productName,
      category,
      unit,
      basePrice,
      physicalQuantity = 0,
    } = req.body;

    if (
      !productCode ||
      !productName ||
      !category ||
      !unit ||
      basePrice === undefined
    ) {
      return res.status(400).json({
        message:
          "productCode, productName, category, unit and basePrice are required",
      });
    }

    if (Number(basePrice) < 0 || Number(physicalQuantity) < 0) {
      return res.status(400).json({
        message: "Price and quantity cannot be negative",
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { productCode },
    });

    if (existingProduct) {
      return res.status(409).json({
        message: "Product code already exists",
      });
    }

    const product = await prisma.product.create({
      data: {
        productCode,
        productName,
        category,
        unit,
        basePrice: Number(basePrice),

        inventory: {
          create: {
            physicalQuantity: Number(physicalQuantity),
            reservedQuantity: 0,
          },
        },
      },
      include: {
        inventory: true,
      },
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventory: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      products,
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        inventory: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      product,
    });
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    const {
      productCode,
      productName,
      category,
      unit,
      basePrice,
    } = req.body;

    if (basePrice !== undefined && Number(basePrice) < 0) {
      return res.status(400).json({
        message: "Price cannot be negative",
      });
    }

    if (
      productCode &&
      productCode !== existingProduct.productCode
    ) {
      const duplicate = await prisma.product.findUnique({
        where: { productCode },
      });

      if (duplicate) {
        return res.status(409).json({
          message: "Product code already exists",
        });
      }
    }

    const product = await prisma.product.update({
      where: { id },

      data: {
        ...(productCode !== undefined && { productCode }),
        ...(productName !== undefined && { productName }),
        ...(category !== undefined && { category }),
        ...(unit !== undefined && { unit }),
        ...(basePrice !== undefined && {
          basePrice: Number(basePrice),
        }),
      },

      include: {
        inventory: true,
      },
    });

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
};