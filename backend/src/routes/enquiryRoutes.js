const express = require("express");

const {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
} = require("../controllers/enquiryController");

const {
  authenticate,
  authorize,
} = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// ==========================================
// CREATE ENQUIRY
// ONLY CUSTOMER
// ==========================================

router.post(
  "/",
  authorize("CUSTOMER"),
  createEnquiry
);

// ==========================================
// VIEW ENQUIRIES
// ADMIN + CUSTOMER
// ==========================================

router.get(
  "/",
  authorize("ADMIN", "CUSTOMER"),
  getEnquiries
);

// ==========================================
// VIEW SINGLE ENQUIRY
// ADMIN + CUSTOMER
// ==========================================

router.get(
  "/:id",
  authorize("ADMIN", "CUSTOMER"),
  getEnquiryById
);

// ==========================================
// UPDATE STATUS
// ADMIN ONLY
// ==========================================

router.patch(
  "/:id/status",
  authorize("ADMIN"),
  updateEnquiryStatus
);

module.exports = router;