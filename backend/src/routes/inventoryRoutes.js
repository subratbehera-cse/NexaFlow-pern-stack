const express = require("express");

const {
  getInventory,
  getInventoryByProduct,
  updateStock,
  reserveStock,
  releaseStock,
} = require("../controllers/inventoryController");

const {
  authenticate,
  authorize,
} = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// ADMIN + SALES can view inventory
router.get("/", getInventory);
router.get("/:productId", getInventoryByProduct);

// ADMIN only can modify stock
router.patch(
  "/:productId/stock",
  authorize("ADMIN"),
  updateStock
);

// Reservation operations
router.post(
  "/:productId/reserve",
  authorize("ADMIN", "SALES"),
  reserveStock
);

router.post(
  "/:productId/release",
  authorize("ADMIN", "SALES"),
  releaseStock
);

module.exports = router;