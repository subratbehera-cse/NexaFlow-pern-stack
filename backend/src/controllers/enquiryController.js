const prisma = require("../config/prisma");

const createEnquiry = async (req, res, next) => {
  try {
    const {
      customerId,
      enquiryDate,
      requiredDate,
      notes,
      items,
    } = req.body;

    if (!requiredDate || !items || items.length === 0) {
      return res.status(400).json({
        message: "requiredDate and at least one item are required",
      });
    }

    let finalCustomerId;

    // ==========================================
    // CUSTOMER
    // Customer can create enquiry only for self
    // ==========================================
    if (req.user.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: {
          userId: req.user.id,
        },
      });

      if (!customer) {
        return res.status(404).json({
          message: "Customer profile not found for this account",
        });
      }

      finalCustomerId = customer.id;
    }

    // ==========================================
    // ADMIN / SALES
    // Internal users can select customer
    // ==========================================
    else {
      if (!customerId) {
        return res.status(400).json({
          message: "customerId is required",
        });
      }

      finalCustomerId = Number(customerId);

      if (Number.isNaN(finalCustomerId)) {
        return res.status(400).json({
          message: "Invalid customer ID",
        });
      }

      const customer = await prisma.customer.findUnique({
        where: {
          id: finalCustomerId,
        },
      });

      if (!customer) {
        return res.status(404).json({
          message: "Customer not found",
        });
      }
    }

    // ==========================================
    // VALIDATE ITEMS
    // ==========================================
    for (const item of items) {
      if (
        !item.productId ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        return res.status(400).json({
          message:
            "Each item must have a valid productId and quantity",
        });
      }

      const product = await prisma.product.findUnique({
        where: {
          id: Number(item.productId),
        },
      });

      if (!product) {
        return res.status(404).json({
          message: `Product ${item.productId} not found`,
        });
      }
    }

    // ==========================================
    // PREVENT DUPLICATE PRODUCT
    // ==========================================
    const productIds = items.map((item) =>
      Number(item.productId)
    );

    if (
      new Set(productIds).size !== productIds.length
    ) {
      return res.status(400).json({
        message:
          "The same product cannot be added twice. Increase its quantity instead.",
      });
    }

    // ==========================================
    // GENERATE ENQUIRY NUMBER
    // ==========================================
    const enquiryCount = await prisma.enquiry.count();

    const enquiryNumber = `ENQ-${new Date().getFullYear()}-${String(
      enquiryCount + 1
    ).padStart(4, "0")}`;

    // ==========================================
    // CREATE ENQUIRY
    // ==========================================
    const enquiry = await prisma.enquiry.create({
      data: {
        enquiryNumber,
        customerId: finalCustomerId,
        createdById: req.user.id,

        enquiryDate: enquiryDate
          ? new Date(enquiryDate)
          : new Date(),

        requiredDate: new Date(requiredDate),

        notes: notes?.trim() || null,

        items: {
          create: items.map((item) => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
          })),
        },
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

    res.status(201).json({
      message: "Enquiry created successfully",
      enquiry,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET ENQUIRIES
// ==========================================

const getEnquiries = async (req, res, next) => {
  try {
    const { search = "", status = "" } = req.query;

    const where = {};

    // ==========================================
    // CUSTOMER -> ONLY OWN ENQUIRIES
    // ==========================================
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

    // ==========================================
    // SEARCH
    // Enquiry No
    // Customer Name
    // Company Name
    // ==========================================
    if (search.trim()) {
      const searchValue = search.trim();

      where.OR = [
        {
          enquiryNumber: {
            contains: searchValue,
            mode: "insensitive",
          },
        },
        {
          customer: {
            companyName: {
              contains: searchValue,
              mode: "insensitive",
            },
          },
        },
        {
          customer: {
            contactPerson: {
              contains: searchValue,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    // ==========================================
    // STATUS FILTER
    // ==========================================
    if (
      status &&
      ["NEW", "QUOTED", "WON", "LOST"].includes(status)
    ) {
      where.status = status;
    }

    // ==========================================
    // GET DATA
    // ==========================================
    const enquiries = await prisma.enquiry.findMany({
      where,

      include: {
        customer: true,

        items: {
          include: {
            product: true,
          },
        },

        quotations: {
          select: {
            id: true,
            quotationNumber: true,
            status: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      enquiries,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SINGLE ENQUIRY
// ==========================================

const getEnquiryById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid enquiry ID",
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: {
        id,
      },

      include: {
        customer: true,

        items: {
          include: {
            product: true,
          },
        },

        quotations: true,
      },
    });

    if (!enquiry) {
      return res.status(404).json({
        message: "Enquiry not found",
      });
    }

    // ==========================================
    // CUSTOMER -> ONLY OWN ENQUIRY
    // ==========================================
    if (req.user.role === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: {
          userId: req.user.id,
        },
      });

      if (
        !customer ||
        enquiry.customerId !== customer.id
      ) {
        return res.status(403).json({
          message:
            "You are not authorized to access this enquiry",
        });
      }
    }

    res.json({
      enquiry,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE ENQUIRY STATUS
// ==========================================

const updateEnquiryStatus = async (
  req,
  res,
  next
) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid enquiry ID",
      });
    }

    // ==========================================
    // CUSTOMER CANNOT CHANGE STATUS
    // ==========================================
    if (req.user.role === "CUSTOMER") {
      return res.status(403).json({
        message:
          "Customers cannot change enquiry status",
      });
    }

    const allowedStatuses = [
      "NEW",
      "QUOTED",
      "WON",
      "LOST",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid enquiry status",
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: {
        id,
      },
    });

    if (!enquiry) {
      return res.status(404).json({
        message: "Enquiry not found",
      });
    }

    const updatedEnquiry =
      await prisma.enquiry.update({
        where: {
          id,
        },

        data: {
          status,
        },
      });

    res.json({
      message:
        "Enquiry status updated successfully",
      enquiry: updatedEnquiry,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
};