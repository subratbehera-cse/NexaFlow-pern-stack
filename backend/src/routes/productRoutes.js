const express = require("express");

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
} = require("../controllers/productController");

const {
  authenticate,
  authorize,
} = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

// ADMIN only
router.post("/", authorize("ADMIN"), createProduct);

// ADMIN + SALES
router.get("/", getProducts);
router.get("/:id", getProductById);

// ADMIN only
router.patch("/:id", authorize("ADMIN"), updateProduct);

module.exports = router;