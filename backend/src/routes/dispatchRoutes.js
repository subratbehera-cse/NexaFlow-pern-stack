const express = require("express");

const {
  createDispatch,
  getDispatches,
  getDispatchById,
} = require("../controllers/dispatchController");

const {
  authenticate,
  authorize,
} = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  authorize("ADMIN", "SALES"),
  getDispatches
);

router.get(
  "/:id",
  authorize("ADMIN", "SALES"),
  getDispatchById
);

module.exports = router;