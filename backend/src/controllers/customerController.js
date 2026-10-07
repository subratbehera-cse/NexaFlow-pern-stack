const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");

// ==========================================
// CREATE CUSTOMER
// ==========================================

const createCustomer = async (req, res, next) => {
  try {
    const {
      companyName,
      contactPerson,
      mobile,
      email,
      city,
      password,
    } = req.body;

    if (
      !companyName ||
      !contactPerson ||
      !mobile ||
      !email ||
      !city ||
      !password
    ) {
      return res.status(400).json({
        message: "All customer fields are required",
      });
    }

    const cleanCompanyName = companyName.trim();
    const cleanContactPerson = contactPerson.trim();
    const cleanMobile = mobile.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const cleanCity = city.trim();

    // ==========================================
    // VALIDATE COMPANY
    // ==========================================

    if (cleanCompanyName.length < 2) {
      return res.status(400).json({
        message:
          "Company name must contain at least 2 characters",
      });
    }

    // ==========================================
    // VALIDATE CONTACT PERSON
    // ==========================================

    if (cleanContactPerson.length < 2) {
      return res.status(400).json({
        message:
          "Contact person name must contain at least 2 characters",
      });
    }

    // ==========================================
    // VALIDATE MOBILE
    // ==========================================

    const mobileRegex = /^[6-9][0-9]{9}$/;

    if (!mobileRegex.test(cleanMobile)) {
      return res.status(400).json({
        message:
          "Invalid mobile number. Enter a valid 10-digit Indian mobile number",
      });
    }

    // ==========================================
    // VALIDATE EMAIL
    // ==========================================

    const emailRegex =
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Invalid email address",
      });
    }

    // ==========================================
    // VALIDATE PASSWORD
    // ==========================================

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must contain at least 6 characters",
      });
    }

    // ==========================================
    // CHECK DUPLICATES
    // ==========================================

    const existingCustomers =
      await prisma.customer.findMany({
        select: {
          id: true,
          companyName: true,
          mobile: true,
          email: true,
        },
      });

    const duplicateCompany =
      existingCustomers.find(
        (customer) =>
          customer.companyName
            .trim()
            .toLowerCase() ===
          cleanCompanyName.toLowerCase()
      );

    if (duplicateCompany) {
      return res.status(409).json({
        message:
          "A customer with this company name already exists",
      });
    }

    const duplicateMobile =
      existingCustomers.find(
        (customer) =>
          customer.mobile === cleanMobile
      );

    if (duplicateMobile) {
      return res.status(409).json({
        message:
          "A customer with this mobile number already exists",
      });
    }

    const duplicateEmail =
      existingCustomers.find(
        (customer) =>
          customer.email.trim().toLowerCase() ===
          normalizedEmail
      );

    if (duplicateEmail) {
      return res.status(409).json({
        message:
          "A customer with this email already exists",
      });
    }

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (existingUser) {
      return res.status(409).json({
        message:
          "An account with this email already exists",
      });
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    // ==========================================
    // CREATE USER + CUSTOMER
    // ==========================================

    const customer =
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: cleanContactPerson,
            email: normalizedEmail,
            passwordHash,
            role: "CUSTOMER",
          },
        });

        return tx.customer.create({
          data: {
            companyName: cleanCompanyName,
            contactPerson: cleanContactPerson,
            mobile: cleanMobile,
            email: normalizedEmail,
            city: cleanCity,
            userId: user.id,
          },

          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        });
      });

    res.status(201).json({
      message:
        "Customer and login account created successfully",
      customer,
    });
  } catch (error) {
    if (error.code === "P2002") {
      const fields = error.meta?.target || [];

      if (fields.includes("mobile")) {
        return res.status(409).json({
          message:
            "A customer with this mobile number already exists",
        });
      }

      if (fields.includes("email")) {
        return res.status(409).json({
          message:
            "A customer with this email already exists",
        });
      }

      if (fields.includes("companyName")) {
        return res.status(409).json({
          message:
            "A customer with this company name already exists",
        });
      }

      return res.status(409).json({
        message:
          "Duplicate customer data is not allowed",
      });
    }

    next(error);
  }
};

// ==========================================
// GET ALL CUSTOMERS
// ==========================================

const getCustomers = async (req, res, next) => {
  try {
    const customers =
      await prisma.customer.findMany({
        orderBy: {
          createdAt: "desc",
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

    res.json({
      customers,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET CUSTOMER BY ID
// ==========================================

const getCustomerById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const customer =
      await prisma.customer.findUnique({
        where: {
          id,
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    res.json({
      customer,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET LOGGED-IN CUSTOMER PROFILE
// ==========================================

const getMyCustomer = async (
  req,
  res,
  next
) => {
  try {
    if (req.user.role !== "CUSTOMER") {
      return res.status(403).json({
        message:
          "This endpoint is only available for customers",
      });
    }

    const customer =
      await prisma.customer.findUnique({
        where: {
          userId: req.user.id,
        },

        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

    if (!customer) {
      return res.status(404).json({
        message:
          "Customer profile not found for this account",
      });
    }

    res.json({
      customer,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  getMyCustomer,
};