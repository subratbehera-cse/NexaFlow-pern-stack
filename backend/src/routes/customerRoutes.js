const express = require("express");

const {
  createCustomer,
  getCustomers,
  getCustomerById,
  getMyCustomer,
} = require("../controllers/customerController");

const {
  authenticate,
  authorize,
} = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// ==========================================
// LOGGED-IN CUSTOMER PROFILE
// IMPORTANT: /me must come before /:id
// ==========================================

router.get(
  "/me",
  authorize("CUSTOMER"),
  getMyCustomer
);

// ==========================================
// ADMIN CUSTOMER MANAGEMENT
// ==========================================

router.post(
  "/",
  authorize("ADMIN"),
  createCustomer
);

router.get(
  "/",
  authorize("ADMIN", "SALES"),
  getCustomers
);

router.get(
  "/:id",
  authorize("ADMIN", "SALES"),
  getCustomerById
);

module.exports = router;