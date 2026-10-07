const prisma = require("../config/prisma");

// =====================================================
// CALCULATE QUOTATION TOTALS
// =====================================================

const calculateQuotation = async (items, discountAmount = 0) => {
  let subtotal = 0;
  let itemDiscountTotal = 0;
  let gstAmount = 0;

  const quotationItems = [];
  const productIds = new Set();

  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const discountPct = Number(item.discountPct || 0);
    const gstPct = Number(item.gstPct || 0);

    if (
      !Number.isInteger(productId) ||
      productId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      Number.isNaN(unitPrice) ||
      unitPrice < 0 ||
      Number.isNaN(discountPct) ||
      discountPct < 0 ||
      discountPct > 100 ||
      Number.isNaN(gstPct) ||
      gstPct < 0
    ) {
      throw new Error("Invalid quotation item values");
    }

    if (productIds.has(productId)) {
      throw new Error(
        "The same product cannot be added more than once"
      );
    }

    productIds.add(productId);

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const grossAmount = quantity * unitPrice;

    const itemDiscount =
      grossAmount * (discountPct / 100);

    const taxableAmount =
      grossAmount - itemDiscount;

    const itemGst =
      taxableAmount * (gstPct / 100);

    const lineAmount =
      taxableAmount + itemGst;

    subtotal += grossAmount;
    itemDiscountTotal += itemDiscount;
    gstAmount += itemGst;

    quotationItems.push({
      productId,
      quantity,
      unitPrice,
      discountPct,
      gstPct,
      lineAmount,
    });
  }

  const discount = Number(discountAmount);

  if (
    Number.isNaN(discount) ||
    discount < 0 ||
    discount > subtotal - itemDiscountTotal
  ) {
    throw new Error("Invalid discount amount");
  }

  const grandTotal =
    subtotal -
    itemDiscountTotal -
    discount +
    gstAmount;

  return {
    quotationItems,
    subtotal,
    discountAmount: discount,
    gstAmount,
    grandTotal,
  };
};

// =====================================================
// CREATE QUOTATION
// ADMIN ONLY
// =====================================================

const createQuotation = async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "Only admin can create quotations",
      });
    }

    const {
      enquiryId,
      validUntil,
      discountAmount = 0,
      items,
    } = req.body;

    if (
      !enquiryId ||
      !validUntil ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "enquiryId, validUntil and at least one item are required",
      });
    }

    const parsedEnquiryId = Number(enquiryId);

    if (
      !Number.isInteger(parsedEnquiryId) ||
      parsedEnquiryId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid enquiry ID",
      });
    }

    const validUntilDate = new Date(validUntil);

    if (Number.isNaN(validUntilDate.getTime())) {
      return res.status(400).json({
        message: "Invalid validUntil date",
      });
    }

    const enquiry = await prisma.enquiry.findUnique({
      where: {
        id: parsedEnquiryId,
      },
      include: {
        customer: true,
        quotations: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!enquiry) {
      return res.status(404).json({
        message: "Enquiry not found",
      });
    }

    if (enquiry.quotations.length > 0) {
      return res.status(409).json({
        message:
          "Quotation already exists for this enquiry",
      });
    }

    if (enquiry.status === "LOST") {
      return res.status(400).json({
        message:
          "Quotation cannot be created for a lost enquiry",
      });
    }

    const calculated = await calculateQuotation(
      items,
      discountAmount
    );

    const quotationCount =
      await prisma.quotation.count();

    const quotationNumber =
      `QUO-${new Date().getFullYear()}-${String(
        quotationCount + 1
      ).padStart(4, "0")}`;

    const quotation =
      await prisma.quotation.create({
        data: {
          quotationNumber,
          enquiryId: parsedEnquiryId,
          customerId: enquiry.customerId,
          createdById: req.user.id,
          validUntil: validUntilDate,
          status: "DRAFT",

          subtotal: calculated.subtotal,
          discountAmount:
            calculated.discountAmount,
          gstAmount: calculated.gstAmount,
          grandTotal: calculated.grandTotal,

          negotiationMessage: null,

          items: {
            create: calculated.quotationItems,
          },
        },

        include: {
          customer: true,
          enquiry: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

    await prisma.enquiry.update({
      where: {
        id: parsedEnquiryId,
      },
      data: {
        status: "QUOTED",
      },
    });

    return res.status(201).json({
      message: "Quotation created successfully",
      quotation,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// GET QUOTATIONS
// =====================================================

const getQuotations = async (req, res, next) => {
  try {
    const where = {};

    if (req.user.role === "CUSTOMER") {
      const customer =
        await prisma.customer.findUnique({
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

    const {
      search = "",
      status = "",
    } = req.query;

    if (search.trim()) {
      const value = search.trim();

      where.OR = [
        {
          quotationNumber: {
            contains: value,
            mode: "insensitive",
          },
        },
        {
          customer: {
            companyName: {
              contains: value,
              mode: "insensitive",
            },
          },
        },
        {
          customer: {
            contactPerson: {
              contains: value,
              mode: "insensitive",
            },
          },
        },
        {
          enquiry: {
            enquiryNumber: {
              contains: value,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const allowedStatuses = [
      "DRAFT",
      "SENT",
      "NEGOTIATION",
      "ACCEPTED",
      "REJECTED",
    ];

    if (
      status &&
      allowedStatuses.includes(status)
    ) {
      where.status = status;
    }

    const quotations =
      await prisma.quotation.findMany({
        where,

        include: {
          customer: true,
          enquiry: true,

          items: {
            include: {
              product: true,
            },
          },

          salesOrder: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    res.json({
      quotations,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// GET QUOTATION BY ID
// =====================================================

const getQuotationById = async (
  req,
  res,
  next
) => {
  try {
    const id = Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        message: "Invalid quotation ID",
      });
    }

    const quotation =
      await prisma.quotation.findUnique({
        where: {
          id,
        },

        include: {
          customer: true,
          enquiry: true,

          items: {
            include: {
              product: true,
            },
          },

          salesOrder: true,
        },
      });

    if (!quotation) {
      return res.status(404).json({
        message: "Quotation not found",
      });
    }

    if (req.user.role === "CUSTOMER") {
      const customer =
        await prisma.customer.findUnique({
          where: {
            userId: req.user.id,
          },
        });

      if (
        !customer ||
        quotation.customerId !== customer.id
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to view this quotation",
        });
      }
    }

    res.json({
      quotation,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// UPDATE QUOTATION
// ADMIN ONLY
//
// Allowed:
// DRAFT -> modify
// NEGOTIATION -> modify
//
// Cannot modify SENT / ACCEPTED / REJECTED
// =====================================================

const updateQuotation = async (
  req,
  res,
  next
) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        message:
          "Only admin can modify quotations",
      });
    }

    const id = Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        message: "Invalid quotation ID",
      });
    }

    const quotation =
      await prisma.quotation.findUnique({
        where: {
          id,
        },
      });

    if (!quotation) {
      return res.status(404).json({
        message: "Quotation not found",
      });
    }

    if (
      quotation.status !== "DRAFT" &&
      quotation.status !== "NEGOTIATION"
    ) {
      return res.status(400).json({
        message:
          "Only draft or negotiation quotations can be modified",
      });
    }

    const {
      validUntil,
      discountAmount = 0,
      items,
    } = req.body;

    if (
      !validUntil ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "validUntil and at least one item are required",
      });
    }

    const validUntilDate = new Date(validUntil);

    if (Number.isNaN(validUntilDate.getTime())) {
      return res.status(400).json({
        message: "Invalid validUntil date",
      });
    }

    const calculated =
      await calculateQuotation(
        items,
        discountAmount
      );

    const updatedQuotation =
      await prisma.$transaction(
        async (tx) => {
          await tx.quotationItem.deleteMany({
            where: {
              quotationId: id,
            },
          });

          return tx.quotation.update({
            where: {
              id,
            },

            data: {
              validUntil: validUntilDate,

              subtotal:
                calculated.subtotal,

              discountAmount:
                calculated.discountAmount,

              gstAmount:
                calculated.gstAmount,

              grandTotal:
                calculated.grandTotal,

              items: {
                create:
                  calculated.quotationItems,
              },
            },

            include: {
              customer: true,
              enquiry: true,

              items: {
                include: {
                  product: true,
                },
              },
            },
          });
        }
      );

    res.json({
      message:
        "Quotation updated successfully",
      quotation: updatedQuotation,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// UPDATE QUOTATION STATUS
// =====================================================

const updateQuotationStatus = async (
  req,
  res,
  next
) => {
  try {
    const id = Number(req.params.id);
    const { status, negotiationMessage } =
      req.body;

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      return res.status(400).json({
        message: "Invalid quotation ID",
      });
    }

    const allowedStatuses = [
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "NEGOTIATION",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid quotation status",
      });
    }

    const quotation =
      await prisma.quotation.findUnique({
        where: {
          id,
        },
      });

    if (!quotation) {
      return res.status(404).json({
        message: "Quotation not found",
      });
    }

    // ===================================================
    // ADMIN
    // ===================================================

    if (req.user.role === "ADMIN") {
      // SEND / SEND AGAIN
      if (status === "SENT") {
        if (
          quotation.status !== "DRAFT" &&
          quotation.status !== "NEGOTIATION"
        ) {
          return res.status(400).json({
            message:
              "Only draft or negotiation quotations can be sent",
          });
        }

        const updatedQuotation =
          await prisma.quotation.update({
            where: {
              id,
            },

            data: {
              status: "SENT",
              negotiationMessage: null,
            },
          });

        return res.json({
          message:
            quotation.status ===
            "NEGOTIATION"
              ? "Quotation sent again successfully"
              : "Quotation sent successfully",

          quotation: updatedQuotation,
        });
      }

      // ADMIN REJECTS NEGOTIATED QUOTATION
      if (status === "REJECTED") {
        if (
          quotation.status !== "NEGOTIATION"
        ) {
          return res.status(400).json({
            message:
              "Admin can reject only a quotation in negotiation",
          });
        }

        const result =
          await prisma.$transaction(
            async (tx) => {
              const updatedQuotation =
                await tx.quotation.update({
                  where: {
                    id,
                  },

                  data: {
                    status: "REJECTED",
                  },
                });

              await tx.enquiry.update({
                where: {
                  id: quotation.enquiryId,
                },

                data: {
                  status: "LOST",
                },
              });

              return updatedQuotation;
            }
          );

        return res.json({
          message:
            "Quotation rejected successfully",
          quotation: result,
        });
      }

      return res.status(403).json({
        message:
          "Admin can only send or reject negotiated quotations",
      });
    }

    // ===================================================
    // CUSTOMER
    // ===================================================

    if (req.user.role === "CUSTOMER") {
      const customer =
        await prisma.customer.findUnique({
          where: {
            userId: req.user.id,
          },
        });

      if (!customer) {
        return res.status(404).json({
          message:
            "Customer profile not found",
        });
      }

      if (
        quotation.customerId !== customer.id
      ) {
        return res.status(403).json({
          message:
            "You are not allowed to modify this quotation",
        });
      }

      if (quotation.status !== "SENT") {
        return res.status(400).json({
          message:
            "Only sent quotations can be responded to",
        });
      }

      // ACCEPT
      if (status === "ACCEPTED") {
        const result =
          await prisma.$transaction(
            async (tx) => {
              const updatedQuotation =
                await tx.quotation.update({
                  where: {
                    id,
                  },

                  data: {
                    status: "ACCEPTED",
                  },
                });

              await tx.enquiry.update({
                where: {
                  id: quotation.enquiryId,
                },

                data: {
                  status: "WON",
                },
              });

              return updatedQuotation;
            }
          );

        return res.json({
          message:
            "Quotation accepted successfully",
          quotation: result,
        });
      }

      // REJECT
      if (status === "REJECTED") {
        const result =
          await prisma.$transaction(
            async (tx) => {
              const updatedQuotation =
                await tx.quotation.update({
                  where: {
                    id,
                  },

                  data: {
                    status: "REJECTED",
                  },
                });

              await tx.enquiry.update({
                where: {
                  id: quotation.enquiryId,
                },

                data: {
                  status: "LOST",
                },
              });

              return updatedQuotation;
            }
          );

        return res.json({
          message:
            "Quotation rejected successfully",
          quotation: result,
        });
      }

      // NEGOTIATION
      if (status === "NEGOTIATION") {
        const message =
          String(
            negotiationMessage || ""
          ).trim();

        if (!message) {
          return res.status(400).json({
            message:
              "Please provide a negotiation message",
          });
        }

        if (message.length > 1000) {
          return res.status(400).json({
            message:
              "Negotiation message cannot exceed 1000 characters",
          });
        }

        const updatedQuotation =
          await prisma.quotation.update({
            where: {
              id,
            },

            data: {
              status: "NEGOTIATION",
              negotiationMessage: message,
            },
          });

        return res.json({
          message:
            "Quotation moved to negotiation",
          quotation: updatedQuotation,
        });
      }
    }

    return res.status(403).json({
      message:
        "You are not allowed to perform this action",
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// GET AVAILABLE ENQUIRIES
// =====================================================

const getAvailableEnquiries =
  async (req, res, next) => {
    try {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({
          message:
            "Only admin can access available enquiries",
        });
      }

      const {
        search = "",
      } = req.query;

      const where = {
        quotations: {
          none: {},
        },

        status: {
          not: "LOST",
        },
      };

      if (search.trim()) {
        const value = search.trim();

        where.OR = [
          {
            enquiryNumber: {
              contains: value,
              mode: "insensitive",
            },
          },
          {
            customer: {
              companyName: {
                contains: value,
                mode: "insensitive",
              },
            },
          },
          {
            customer: {
              contactPerson: {
                contains: value,
                mode: "insensitive",
              },
            },
          },
        ];
      }

      const enquiries =
        await prisma.enquiry.findMany({
          where,

          include: {
            customer: true,

            items: {
              include: {
                product: true,
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

module.exports = {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  updateQuotationStatus,
  getAvailableEnquiries,
};