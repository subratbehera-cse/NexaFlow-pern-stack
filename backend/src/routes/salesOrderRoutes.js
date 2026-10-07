const express = require("express");

const {
  createSalesOrderFromQuotation,
  getSalesOrders,
  getSalesOrderById,
  placeSalesOrder,
  confirmSalesOrder,
  cancelSalesOrder,
} = require("../controllers/salesOrderController");

const {
  authenticate,
  authorize,
} = require("../middleware/auth");

const {
  createDispatch,
} = require("../controllers/dispatchController");

const router = express.Router();

router.use(authenticate);

// =========================================================
// CREATE SALES ORDER
// ADMIN ONLY
// =========================================================

router.post(
  "/from-quotation/:quotationId",
  authorize("ADMIN"),
  createSalesOrderFromQuotation
);

// =========================================================
// GET SALES ORDERS
//
// ADMIN + SALES -> all orders
// CUSTOMER -> own orders
// =========================================================

router.get(
  "/",
  authorize("ADMIN", "SALES", "CUSTOMER"),
  getSalesOrders
);

// =========================================================
// GET SALES ORDER BY ID
// =========================================================

router.get(
  "/:id",
  authorize("ADMIN", "SALES", "CUSTOMER"),
  getSalesOrderById
);

// =========================================================
// PLACE SALES ORDER
// ADMIN ONLY
//
// PENDING
//    ↓
// Inventory reserved
//    ↓
// AWAITING_CUSTOMER_CONFIRMATION
// =========================================================

router.post(
  "/:id/place",
  authorize("ADMIN"),
  placeSalesOrder
);

// =========================================================
// CUSTOMER CONFIRMS ORDER
// CUSTOMER ONLY
//
// AWAITING_CUSTOMER_CONFIRMATION
//              ↓
//          CONFIRMED
// =========================================================

router.post(
  "/:id/confirm",
  authorize("CUSTOMER"),
  confirmSalesOrder
);

// =========================================================
// CANCEL SALES ORDER
//
// ADMIN:
// PENDING / AWAITING_CUSTOMER_CONFIRMATION / CONFIRMED
//
// CUSTOMER:
// AWAITING_CUSTOMER_CONFIRMATION
// =========================================================

router.post(
  "/:id/cancel",
  authorize("ADMIN", "CUSTOMER"),
  cancelSalesOrder
);

// =========================================================
// DISPATCH
// ADMIN ONLY
// =========================================================

router.post(
  "/:id/dispatch",
  authorize("ADMIN"),
  createDispatch
);

module.exports = router;