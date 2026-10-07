const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/config/prisma");

jest.setTimeout(60000);

describe("ERPFlow API - Mandatory Test Cases", () => {
  let adminToken;
  let customerToken;

  let customerUser;
  let customer;
  let product;
  let inventory;

  let enquiry;
  let quotation;
  let salesOrder;

  const adminCredentials = {
    email: "admin@erpflow.com",
    password: "Password@123",
  };

  const customerEmail = `test.customer.${Date.now()}@erpflow.test`;
  const customerMobile = `9${String(Date.now()).slice(-9)}`;

  // =========================================================
  // SETUP - ADMIN LOGIN
  // =========================================================

  test("Setup - Admin login should return JWT", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send(adminCredentials);

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeDefined();

    adminToken = response.body.token;
  });

  // =========================================================
  // SETUP - TEST CUSTOMER
  // =========================================================

  test("Setup - Admin should create a test customer account", async () => {
    const response = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        companyName: "ERPFlow Test Company",
        contactPerson: "Test Customer",
        mobile: customerMobile,
        email: customerEmail,
        city: "Cuttack",
        password: "Test@12345",
      });

    expect([200, 201]).toContain(response.statusCode);

    customer =
      response.body.customer ||
      response.body.data ||
      response.body;

    expect(customer.id).toBeDefined();

    customerUser = await prisma.user.findUnique({
      where: {
        email: customerEmail,
      },
    });

    expect(customerUser).toBeDefined();

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: customerEmail,
        password: "Test@12345",
      });

    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    customerToken = loginResponse.body.token;
  });

  // =========================================================
  // SETUP - TEST PRODUCT + INVENTORY
  // =========================================================

  test("Setup - Admin should create a test product and inventory", async () => {
    const productCode = `TEST-${Date.now()}`;

    const productResponse = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        productCode,
        productName: "ERPFlow Test Product",
        category: "Testing",
        unit: "PCS",
        basePrice: 1000,
      });

    expect([200, 201]).toContain(productResponse.statusCode);

    product =
      productResponse.body.product ||
      productResponse.body.data ||
      productResponse.body;

    expect(product.id).toBeDefined();

    // Product creation creates the inventory record.
    // Set the physical quantity using the actual inventory API.
    const inventoryResponse = await request(app)
      .patch(`/api/inventory/${product.id}/stock`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        physicalQuantity: 100,
      });

    expect([200, 201]).toContain(inventoryResponse.statusCode);

    inventory = await prisma.inventory.findUnique({
      where: {
        productId: product.id,
      },
    });

    expect(inventory).toBeDefined();
    expect(inventory.physicalQuantity).toBe(100);
    expect(inventory.reservedQuantity).toBe(0);
  });

  // =========================================================
  // TEST 1
  // QUOTATION TOTAL
  // =========================================================

  test("1. Quotation total should be calculated correctly", async () => {
    const enquiryResponse = await request(app)
      .post("/api/enquiries")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        requiredDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        notes: "Quotation total test",
        items: [
          {
            productId: product.id,
            quantity: 2,
          },
        ],
      });

    expect(enquiryResponse.statusCode).toBe(201);

    enquiry =
      enquiryResponse.body.enquiry ||
      enquiryResponse.body.data ||
      enquiryResponse.body;

    expect(enquiry.id).toBeDefined();

    const validUntil = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const quotationResponse = await request(app)
      .post("/api/quotations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        enquiryId: enquiry.id,
        validUntil,
        discountAmount: 100,
        items: [
          {
            productId: product.id,
            quantity: 2,
            unitPrice: 1000,
            discountPct: 10,
            gstPct: 18,
          },
        ],
      });

    expect(quotationResponse.statusCode).toBe(201);

    quotation =
      quotationResponse.body.quotation ||
      quotationResponse.body.data ||
      quotationResponse.body;

    expect(quotation.id).toBeDefined();

    /*
      Gross:
        2 × 1000 = 2000

      Item discount:
        10% of 2000 = 200

      Taxable:
        2000 - 200 = 1800

      GST:
        18% of 1800 = 324

      Additional quotation discount:
        100

      Grand total:
        2000 - 200 - 100 + 324
        = 2024
    */

    expect(Number(quotation.subtotal)).toBe(2000);
    expect(Number(quotation.discountAmount)).toBe(100);
    expect(Number(quotation.gstAmount)).toBe(324);
    expect(Number(quotation.grandTotal)).toBe(2024);
  });

  // =========================================================
  // TEST 2
  // DRAFT QUOTATION CANNOT CREATE SALES ORDER
  // =========================================================

  test("2. Draft quotation should not create Sales Order", async () => {
    expect(quotation).toBeDefined();
    expect(quotation.status).toBe("DRAFT");

    const response = await request(app)
      .post(`/api/sales-orders/from-quotation/${quotation.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toMatch(
      /Only an ACCEPTED quotation can be converted to Sales Order/i
    );

    const order = await prisma.salesOrder.findUnique({
      where: {
        quotationId: quotation.id,
      },
    });

    expect(order).toBeNull();
  });

  // =========================================================
  // SETUP - SEND QUOTATION
  // =========================================================

  test("Setup - Admin should send quotation to customer", async () => {
    const response = await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "SENT",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.quotation.status).toBe("SENT");
  });

  // =========================================================
  // SETUP - CUSTOMER ACCEPTS QUOTATION
  // =========================================================

  test("Setup - Customer should accept quotation", async () => {
    const response = await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        status: "ACCEPTED",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.quotation.status).toBe("ACCEPTED");

    quotation = response.body.quotation;
  });

  // =========================================================
  // SETUP - CREATE SALES ORDER
  // =========================================================

  test("Setup - Accepted quotation should create Sales Order", async () => {
    const response = await request(app)
      .post(`/api/sales-orders/from-quotation/${quotation.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(201);

    salesOrder =
      response.body.salesOrder ||
      response.body.data ||
      response.body;

    expect(salesOrder.id).toBeDefined();
    expect(salesOrder.status).toBe("PENDING");
    expect(Number(salesOrder.totalAmount)).toBe(2024);
  });

  // =========================================================
  // TEST 3
  // DUPLICATE SALES ORDER
  // =========================================================

  test("3. Same quotation should not create duplicate Sales Order", async () => {
    const response = await request(app)
      .post(`/api/sales-orders/from-quotation/${quotation.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(409);

    expect(response.body.message).toMatch(
      /Sales Order already exists/i
    );

    const orders = await prisma.salesOrder.findMany({
      where: {
        quotationId: quotation.id,
      },
    });

    expect(orders.length).toBe(1);
  });

  // =========================================================
  // TEST 4
  // INSUFFICIENT INVENTORY
  // =========================================================

  test("4. Sales Order should not reserve more than available inventory", async () => {
    expect(salesOrder).toBeDefined();

    /*
      Current stock:
        Physical = 1
        Reserved = 0

      Sales Order requires:
        2

      Therefore available stock = 1
      and reservation must fail.
    */

    await prisma.inventory.update({
      where: {
        productId: product.id,
      },
      data: {
        physicalQuantity: 1,
        reservedQuantity: 0,
      },
    });

    const response = await request(app)
      .post(`/api/sales-orders/${salesOrder.id}/place`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(409);

    expect(response.body.message).toMatch(
      /Insufficient inventory/i
    );

    expect(response.body.availableQuantity).toBe(1);
    expect(response.body.requestedQuantity).toBe(2);

    const updatedInventory = await prisma.inventory.findUnique({
      where: {
        productId: product.id,
      },
    });

    expect(updatedInventory.physicalQuantity).toBe(1);
    expect(updatedInventory.reservedQuantity).toBe(0);

    const updatedOrder = await prisma.salesOrder.findUnique({
      where: {
        id: salesOrder.id,
      },
    });

    expect(updatedOrder.status).toBe("PENDING");
  });

  // =========================================================
  // SETUP - RESTORE INVENTORY
  // =========================================================

  test("Setup - Restore inventory for reservation test", async () => {
    await prisma.inventory.update({
      where: {
        productId: product.id,
      },
      data: {
        physicalQuantity: 100,
        reservedQuantity: 0,
      },
    });

    const inventoryAfterRestore =
      await prisma.inventory.findUnique({
        where: {
          productId: product.id,
        },
      });

    expect(inventoryAfterRestore.physicalQuantity).toBe(100);
    expect(inventoryAfterRestore.reservedQuantity).toBe(0);
  });

  // =========================================================
  // TEST 5
  // UNAUTHORIZED OPERATION
  // =========================================================

  test("5. Customer should not be allowed to place Sales Order", async () => {
    const response = await request(app)
      .post(`/api/sales-orders/${salesOrder.id}/place`)
      .set("Authorization", `Bearer ${customerToken}`);

    /*
      The route-level RBAC middleware blocks the request
      before the controller is reached.
    */
    expect(response.statusCode).toBe(403);

    expect(response.body.message).toBe(
      "You are not authorized to perform this action"
    );

    const updatedOrder = await prisma.salesOrder.findUnique({
      where: {
        id: salesOrder.id,
      },
    });

    expect(updatedOrder.status).toBe("PENDING");
  });

  // =========================================================
  // BONUS
  // SUCCESSFUL INVENTORY RESERVATION
  // =========================================================

  test("Bonus - Admin should reserve available inventory successfully", async () => {
    const response = await request(app)
      .post(`/api/sales-orders/${salesOrder.id}/place`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.salesOrder.status).toBe(
      "AWAITING_CUSTOMER_CONFIRMATION"
    );

    const updatedInventory = await prisma.inventory.findUnique({
      where: {
        productId: product.id,
      },
    });

    expect(updatedInventory.physicalQuantity).toBe(100);
    expect(updatedInventory.reservedQuantity).toBe(2);

    const updatedOrder = await prisma.salesOrder.findUnique({
      where: {
        id: salesOrder.id,
      },
    });

    expect(updatedOrder.status).toBe(
      "AWAITING_CUSTOMER_CONFIRMATION"
    );
  });

  // =========================================================
  // CLEANUP
  // =========================================================

  afterAll(async () => {
    try {
      /*
        Reset test inventory before deleting test data.
        This keeps the test transaction state clean.
      */
      if (product?.id) {
        await prisma.inventory.updateMany({
          where: {
            productId: product.id,
          },
          data: {
            reservedQuantity: 0,
          },
        });
      }

      if (salesOrder?.id) {
        await prisma.dispatchItem.deleteMany({
          where: {
            dispatch: {
              salesOrderId: salesOrder.id,
            },
          },
        });

        await prisma.dispatch.deleteMany({
          where: {
            salesOrderId: salesOrder.id,
          },
        });

        await prisma.salesOrderItem.deleteMany({
          where: {
            salesOrderId: salesOrder.id,
          },
        });

        await prisma.salesOrder.deleteMany({
          where: {
            id: salesOrder.id,
          },
        });
      }

      if (quotation?.id) {
        await prisma.quotationItem.deleteMany({
          where: {
            quotationId: quotation.id,
          },
        });

        await prisma.quotation.deleteMany({
          where: {
            id: quotation.id,
          },
        });
      }

      if (enquiry?.id) {
        await prisma.enquiryItem.deleteMany({
          where: {
            enquiryId: enquiry.id,
          },
        });

        await prisma.enquiry.deleteMany({
          where: {
            id: enquiry.id,
          },
        });
      }

      if (product?.id) {
        await prisma.inventory.deleteMany({
          where: {
            productId: product.id,
          },
        });

        await prisma.product.deleteMany({
          where: {
            id: product.id,
          },
        });
      }

      if (customer?.id) {
        await prisma.customer.deleteMany({
          where: {
            id: customer.id,
          },
        });
      }

      if (customerUser?.id) {
        await prisma.user.deleteMany({
          where: {
            id: customerUser.id,
          },
        });
      }
    } catch (error) {
      console.error("Test cleanup failed:", error);
    }

    await prisma.$disconnect();
  });
});