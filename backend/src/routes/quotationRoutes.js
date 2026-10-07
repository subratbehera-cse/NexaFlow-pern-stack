const express = require("express");

const {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  updateQuotationStatus,
  getAvailableEnquiries,
} = require("../controllers/quotationController");

const {
  authenticate,
  authorize,
} = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// Available enquiries for creating quotation
router.get(
  "/available-enquiries",
  authorize("ADMIN"),
  getAvailableEnquiries
);

// Create quotation
router.post(
  "/",
  authorize("ADMIN"),
  createQuotation
);

// List quotations
router.get(
  "/",
  authorize("ADMIN", "CUSTOMER"),
  getQuotations
);

// View quotation
router.get(
  "/:id",
  authorize("ADMIN", "CUSTOMER"),
  getQuotationById
);

// Modify quotation
router.put(
  "/:id",
  authorize("ADMIN"),
  updateQuotation
);

// Change quotation status
router.patch(
  "/:id/status",
  authorize("ADMIN", "CUSTOMER"),
  updateQuotationStatus
);

module.exports = router;