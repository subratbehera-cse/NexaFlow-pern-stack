const express = require("express");
const cors = require("cors");

const { swaggerUi, swaggerDocument } = require("./docs/swagger");
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const productRoutes = require("./routes/productRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const salesOrderRoutes = require("./routes/salesOrderRoutes");
const dispatchRoutes = require("./routes/dispatchRoutes");


const app = express();

app.use(cors());
app.use(express.json());

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "ERPFlow API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/sales-orders", salesOrderRoutes);
app.use("/api/dispatches", dispatchRoutes);


app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    message: "Internal server error",
  });
});

module.exports = app;