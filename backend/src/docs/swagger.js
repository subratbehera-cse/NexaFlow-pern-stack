const swaggerUi = require("swagger-ui-express");

const swaggerDocument = {
  openapi: "3.0.0",

  info: {
    title: "ERPFlow API",
    version: "1.0.0",
    description:
      "ERP workflow API for Customer Enquiry, Quotation, Sales Order, Inventory Reservation and Dispatch.",
  },

  servers: [
    {
      url: "http://localhost:5100",
      description: "Local development server",
    },
  ],

  tags: [
    {
      name: "Health",
      description: "API health check",
    },
    {
      name: "Auth",
      description: "Authentication APIs",
    },
    {
      name: "Customers",
      description: "Customer management APIs",
    },
    {
      name: "Enquiries",
      description: "Customer enquiry APIs",
    },
    {
      name: "Quotations",
      description: "Quotation management APIs",
    },
    {
      name: "Sales Orders",
      description: "Sales order APIs",
    },
    {
      name: "Inventory",
      description: "Inventory and reservation APIs",
    },
    {
      name: "Dispatch",
      description: "Dispatch APIs",
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },

    schemas: {
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            example: "admin@erpflow.com",
          },
          password: {
            type: "string",
            example: "Password@123",
          },
        },
      },

      Customer: {
        type: "object",
        properties: {
          id:
          {
            type: "integer",
            example: 1,
          },
          companyName: {
            type: "string",
            example: "ABC Industries",
          },
          contactPerson: {
            type: "string",
            example: "Rajesh Kumar",
          },
          mobile: {
            type: "string",
            example: "9876543210",
          },
          email: {
            type: "string",
            example: "rajesh@abc.com",
          },
          city: {
            type: "string",
            example: "Bhubaneswar",
          },
        },
      },

      Product: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            example: 1,
          },
          productCode: {
            type: "string",
            example: "IND-001",
          },
          productName: {
            type: "string",
            example: "Industrial Bearing",
          },
          category: {
            type: "string",
            example: "Mechanical",
          },
          unit: {
            type: "string",
            example: "PCS",
          },
          basePrice: {
            type: "number",
            example: 1250.0,
          },
        },
      },
    },
  },

  paths: {
    // ============================================================
    // HEALTH
    // ============================================================

    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",

        responses: {
          200: {
            description: "API is running",
            content: {
              "application/json": {
                example: {
                  ok: true,
                  message: "ERPFlow API is running",
                },
              },
            },
          },
        },
      },
    },

    // ============================================================
    // AUTHENTICATION
    // ============================================================

    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user",

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest",
              },
            },
          },
        },

        responses: {
          200: {
            description: "Login successful",
          },

          400: {
            description: "Email and password are required",
          },

          401: {
            description: "Invalid email or password",
          },
        },
      },
    },

    // ============================================================
    // CUSTOMERS
    // ============================================================

    "/api/customers": {
      post: {
        tags: ["Customers"],
        summary: "Create a new customer",

        security: [
          {
            bearerAuth: [],
          },
        ],

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                type: "object",

                required: [
                  "companyName",
                  "contactPerson",
                  "mobile",
                  "email",
                  "city",
                ],

                properties: {
                  companyName: {
                    type: "string",
                    example: "ABC Industries",
                  },

                  contactPerson: {
                    type: "string",
                    example: "Rajesh Kumar",
                  },

                  mobile: {
                    type: "string",
                    example: "9876543210",
                  },

                  email: {
                    type: "string",
                    example: "rajesh@abc.com",
                  },

                  city: {
                    type: "string",
                    example: "Bhubaneswar",
                  },
                },
              },
            },
          },
        },

        responses: {
          201: {
            description: "Customer created successfully",
          },

          400: {
            description: "Required fields missing",
          },

          401: {
            description: "Authentication required",
          },
        },
      },

      get: {
        tags: ["Customers"],
        summary: "Get all customers",

        security: [
          {
            bearerAuth: [],
          },
        ],

        responses: {
          200: {
            description: "List of customers",
          },

          401: {
            description: "Authentication required",
          },
        },
      },
    },

    "/api/customers/me": {
      get: {
        tags: ["Customers"],
        summary: "Get the authenticated customer's profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Customer profile retrieved successfully",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Customer access required",
          },
          404: {
            description: "Customer profile not found",
          },
        },
      },
    },

    "/api/customers/{id}": {
      get: {
        tags: ["Customers"],
        summary: "Get customer by ID",

        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,

            schema: {
              type: "integer",
            },

            example: 1,
          },
        ],

        responses: {
          200: {
            description: "Customer found",
          },

          400: {
            description: "Invalid customer ID",
          },

          401: {
            description: "Authentication required",
          },

          404: {
            description: "Customer not found",
          },
        },
      },
    },

    // ============================================================
    // ENQUIRIES
    // ============================================================

    "/api/enquiries": {
      post: {
        tags: ["Enquiries"],
        summary: "Create a new enquiry",

        security: [
          {
            bearerAuth: [],
          },
        ],

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["customerId", "requiredDate", "items"],
                properties: {
                  customerId: {
                    type: "integer",
                    example: 1,
                  },
                  enquiryDate: {
                    type: "string",
                    format: "date-time",
                    example: "2026-10-06T10:00:00Z",
                  },
                  requiredDate: {
                    type: "string",
                    format: "date-time",
                    example: "2026-10-20T00:00:00Z",
                  },
                  notes: {
                    type: "string",
                    example: "Urgent requirement",
                  },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["productId", "quantity"],
                      properties: {
                        productId: {
                          type: "integer",
                          example: 1,
                        },
                        quantity: {
                          type: "integer",
                          example: 10,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        responses: {
          201: {
            description: "Enquiry created successfully",
          },
          400: {
            description: "Invalid enquiry data",
          },
          401: {
            description: "Authentication required",
          },
          404: {
            description: "Customer or product not found",
          },
        },
      },

      get: {
        tags: ["Enquiries"],
        summary: "Get all enquiries",

        security: [
          {
            bearerAuth: [],
          },
        ],

        responses: {
          200: {
            description: "List of enquiries",
          },
          401: {
            description: "Authentication required",
          },
        },
      },
    },

    "/api/enquiries/{id}": {
      get: {
        tags: ["Enquiries"],
        summary: "Get enquiry by ID",

        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],

        responses: {
          200: {
            description: "Enquiry found",
          },
          400: {
            description: "Invalid enquiry ID",
          },
          401: {
            description: "Authentication required",
          },
          404: {
            description: "Enquiry not found",
          },
        },
      },
    },

    "/api/enquiries/{id}/status": {
      patch: {
        tags: ["Enquiries"],
        summary: "Update enquiry status",

        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["NEW", "QUOTED", "WON", "LOST"],
                    example: "QUOTED",
                  },
                },
              },
            },
          },
        },

        responses: {
          200: {
            description: "Enquiry status updated successfully",
          },
          400: {
            description: "Invalid enquiry status",
          },
          401: {
            description: "Authentication required",
          },
          404: {
            description: "Enquiry not found",
          },
        },
      },
    },
    // ============================================================
    // PRODUCTS
    // ============================================================

    "/api/products": {
      post: {
        tags: ["Inventory"],
        summary: "Create a new product",
        security: [
          {
            bearerAuth: [],
          },
        ],

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "productCode",
                  "productName",
                  "category",
                  "unit",
                  "basePrice",
                ],
                properties: {
                  productCode: {
                    type: "string",
                    example: "IND-001",
                  },
                  productName: {
                    type: "string",
                    example: "Industrial Bearing",
                  },
                  category: {
                    type: "string",
                    example: "Mechanical",
                  },
                  unit: {
                    type: "string",
                    example: "PCS",
                  },
                  basePrice: {
                    type: "number",
                    example: 1250,
                  },
                  physicalQuantity: {
                    type: "integer",
                    example: 100,
                  },
                },
              },
            },
          },
        },

        responses: {
          201: {
            description: "Product created successfully",
          },
          400: {
            description: "Invalid product data",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Admin access required",
          },
          409: {
            description: "Product code already exists",
          },
        },
      },

      get: {
        tags: ["Inventory"],
        summary: "Get all products",
        security: [
          {
            bearerAuth: [],
          },
        ],

        responses: {
          200: {
            description: "List of products with inventory",
          },
          401: {
            description: "Authentication required",
          },
        },
      },
    },

    "/api/products/{id}": {
      get: {
        tags: ["Inventory"],
        summary: "Get product by ID",
        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],

        responses: {
          200: {
            description: "Product found",
          },
          401: {
            description: "Authentication required",
          },
          404: {
            description: "Product not found",
          },
        },
      },

      patch: {
        tags: ["Inventory"],
        summary: "Update product",
        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  productCode: {
                    type: "string",
                    example: "IND-001",
                  },
                  productName: {
                    type: "string",
                    example: "Industrial Bearing Premium",
                  },
                  category: {
                    type: "string",
                    example: "Mechanical",
                  },
                  unit: {
                    type: "string",
                    example: "PCS",
                  },
                  basePrice: {
                    type: "number",
                    example: 1350,
                  },
                },
              },
            },
          },
        },

        responses: {
          200: {
            description: "Product updated successfully",
          },
          400: {
            description: "Invalid product data",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Admin access required",
          },
          404: {
            description: "Product not found",
          },
          409: {
            description: "Product code already exists",
          },
        },
      },
    },
    // ============================================================
    // INVENTORY
    // ============================================================

    "/api/inventory": {
      get: {
        tags: ["Inventory"],
        summary: "Get complete inventory",
        security: [{ bearerAuth: [] }],

        responses: {
          200: {
            description: "Inventory list with stock availability",
          },
          401: {
            description: "Authentication required",
          },
        },
      },
    },

    "/api/inventory/{productId}": {
      get: {
        tags: ["Inventory"],
        summary: "Get inventory for a product",
        security: [{ bearerAuth: [] }],

        parameters: [
          {
            name: "productId",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],

        responses: {
          200: {
            description: "Inventory details",
          },
          404: {
            description: "Inventory not found",
          },
        },
      },

    },

    "/api/inventory/{productId}/stock": {
      patch: {
        tags: ["Inventory"],
        summary: "Update physical stock",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "productId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["physicalQuantity"],
                properties: {
                  physicalQuantity: {
                    type: "integer",
                    minimum: 0,
                    example: 100,
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Stock updated successfully" },
          400: { description: "Invalid stock quantity" },
          401: { description: "Authentication required" },
          403: { description: "Admin access required" },
          404: { description: "Inventory not found" },
        },
      },
    },

    "/api/inventory/{productId}/reserve": {
      post: {
        tags: ["Inventory"],
        summary: "Reserve available stock",
        security: [{ bearerAuth: [] }],

        parameters: [
          {
            name: "productId",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantity"],
                properties: {
                  quantity: {
                    type: "integer",
                    example: 20,
                  },
                },
              },
            },
          },
        },

        responses: {
          200: {
            description: "Stock reserved successfully",
          },
          409: {
            description: "Insufficient available stock",
          },
        },
      },
    },

    "/api/inventory/{productId}/release": {
      post: {
        tags: ["Inventory"],
        summary: "Release reserved stock",
        security: [{ bearerAuth: [] }],

        parameters: [
          {
            name: "productId",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
            example: 1,
          },
        ],

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantity"],
                properties: {
                  quantity: {
                    type: "integer",
                    example: 20,
                  },
                },
              },
            },
          },
        },

        responses: {
          200: {
            description: "Reserved stock released successfully",
          },
          400: {
            description: "Invalid release quantity",
          },
        },
      },
    },
    // ============================================================
    // QUOTATIONS
    // ============================================================

    "/api/quotations/available-enquiries": {
      get: {
        tags: ["Quotations"],
        summary: "Get enquiries available for quotation",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Available enquiries retrieved successfully",
          },
          401: { description: "Authentication required" },
          403: { description: "Admin access required" },
        },
      },
    },

    "/api/quotations": {
      post: {
        tags: ["Quotations"],
        summary: "Create a quotation from an enquiry",

        security: [
          {
            bearerAuth: [],
          },
        ],

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "enquiryId",
                  "validUntil",
                  "items",
                ],
                properties: {
                  enquiryId: {
                    type: "integer",
                    example: 1,
                  },

                  validUntil: {
                    type: "string",
                    format: "date-time",
                    example: "2026-10-30T00:00:00Z",
                  },

                  discountAmount: {
                    type: "number",
                    example: 500,
                  },

                  items: {
                    type: "array",

                    items: {
                      type: "object",

                      required: [
                        "productId",
                        "quantity",
                        "unitPrice",
                      ],

                      properties: {
                        productId: {
                          type: "integer",
                          example: 1,
                        },

                        quantity: {
                          type: "integer",
                          example: 10,
                        },

                        unitPrice: {
                          type: "number",
                          example: 1250,
                        },

                        discountPct: {
                          type: "number",
                          example: 5,
                        },

                        gstPct: {
                          type: "number",
                          example: 18,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        responses: {
          201: {
            description: "Quotation created successfully",
          },
          400: {
            description: "Invalid quotation data",
          },
          404: {
            description: "Enquiry or product not found",
          },
          409: {
            description: "Quotation already exists",
          },
        },
      },

      get: {
        tags: ["Quotations"],
        summary: "Get all quotations",

        security: [
          {
            bearerAuth: [],
          },
        ],

        responses: {
          200: {
            description: "List of quotations",
          },
        },
      },
    },

    "/api/quotations/{id}": {
      get: {
        tags: ["Quotations"],
        summary: "Get quotation by ID",

        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,

            schema: {
              type: "integer",
            },

            example: 1,
          },
        ],

        responses: {
          200: {
            description: "Quotation found",
          },
          404: {
            description: "Quotation not found",
          },
        },
      },

      put: {
        tags: ["Quotations"],
        summary: "Update a draft or negotiation quotation",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["validUntil", "items"],
                properties: {
                  validUntil: {
                    type: "string",
                    format: "date-time",
                    example: "2026-10-30T00:00:00Z",
                  },
                  discountAmount: { type: "number", example: 500 },
                  items: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      required: ["productId", "quantity", "unitPrice"],
                      properties: {
                        productId: { type: "integer", example: 1 },
                        quantity: { type: "integer", minimum: 1, example: 10 },
                        unitPrice: { type: "number", minimum: 0, example: 1250 },
                        discountPct: { type: "number", minimum: 0, example: 5 },
                        gstPct: { type: "number", minimum: 0, example: 18 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Quotation updated successfully" },
          400: { description: "Invalid quotation or immutable status" },
          401: { description: "Authentication required" },
          403: { description: "Admin access required" },
          404: { description: "Quotation not found" },
        },
      },
    },

    "/api/quotations/{id}/status": {
      patch: {
        tags: ["Quotations"],
        summary: "Update quotation status",

        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,

            schema: {
              type: "integer",
            },

            example: 1,
          },
        ],

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                type: "object",

                required: ["status"],

                properties: {
                  status: {
                    type: "string",

                    enum: [
                      "SENT",
                      "NEGOTIATION",
                      "ACCEPTED",
                      "REJECTED",
                    ],

                    example: "ACCEPTED",
                  },
                  negotiationMessage: {
                    type: "string",
                    maxLength: 1000,
                    example: "Please review the delivery timeline.",
                  },
                },
              },
            },
          },
        },

        responses: {
          200: {
            description:
              "Quotation status updated successfully",
          },
          400: {
            description: "Invalid quotation status",
          },
          404: {
            description: "Quotation not found",
          },
        },
      },
    },
    "/api/sales-orders/from-quotation/{quotationId}": {
      post: {
        tags: ["Sales Orders"],
        summary: "Create Sales Order from accepted quotation",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "quotationId",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          201: {
            description: "Sales Order created successfully",
          },
          400: {
            description: "Quotation is not accepted or has no items",
          },
          404: {
            description: "Quotation not found",
          },
          409: {
            description: "Sales Order already exists",
          },
        },
      },
    },

    "/api/sales-orders": {
      get: {
        tags: ["Sales Orders"],
        summary: "Get all Sales Orders",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Sales Orders retrieved successfully",
          },
        },
      },
    },

    "/api/sales-orders/{id}": {
      get: {
        tags: ["Sales Orders"],
        summary: "Get Sales Order by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          200: {
            description: "Sales Order retrieved successfully",
          },
          404: {
            description: "Sales Order not found",
          },
        },
      },
    },

    "/api/sales-orders/{id}/place": {
      post: {
        tags: ["Sales Orders"],
        summary: "Place a pending Sales Order and reserve inventory",
        description:
          "ADMIN only. Atomically checks available inventory, reserves the order quantity, and moves the order to AWAITING_CUSTOMER_CONFIRMATION.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            example: 1,
          },
        ],
        responses: {
          200: { description: "Sales Order placed and inventory reserved" },
          400: { description: "Sales Order is not pending or has no items" },
          401: { description: "Authentication required" },
          403: { description: "Admin authorization required" },
          404: { description: "Sales Order or inventory not found" },
          409: { description: "Insufficient inventory or concurrent inventory change" },
        },
      },
    },

    "/api/sales-orders/{id}/confirm": {
      post: {
        tags: ["Sales Orders"],
        summary: "Customer confirms Sales Order",
        description:
          "CUSTOMER only. Confirms a Sales Order that is awaiting customer confirmation.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          200: {
            description:
              "Sales Order confirmed and inventory reserved successfully",
          },
          400: {
            description: "Sales Order cannot be confirmed",
          },
          403: { description: "Customer authorization required" },
          404: {
            description: "Sales Order not found",
          },
          409: {
            description: "Insufficient inventory or concurrent inventory change",
          },
        },
      },
    },

    "/api/sales-orders/{id}/cancel": {
      post: {
        tags: ["Sales Orders"],
        summary: "Cancel Sales Order",
        description:
          "ADMIN only. Cancels the Sales Order and releases reserved inventory if it was confirmed.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          200: {
            description: "Sales Order cancelled successfully",
          },
          400: {
            description: "Sales Order cannot be cancelled",
          },
          403: {
            description: "Admin authorization required",
          },
          404: {
            description: "Sales Order not found",
          },
        },
      },
    },
    "/api/sales-orders/{id}/dispatch": {
      post: {
        tags: ["Dispatch"],
        summary: "Create dispatch for Sales Order",
        description:
          "ADMIN only. Dispatches reserved inventory and changes the Sales Order status to DISPATCHED.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["vehicleNumber", "driverName", "items"],
                properties: {
                  vehicleNumber: {
                    type: "string",
                    example: "OD-02-AB-1234",
                  },
                  driverName: {
                    type: "string",
                    example: "Ramesh Kumar",
                  },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["productId", "quantity"],
                      properties: {
                        productId: {
                          type: "integer",
                          example: 1,
                        },
                        quantity: {
                          type: "integer",
                          example: 10,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Dispatch created successfully",
          },
          400: {
            description: "Sales Order is not confirmed or invalid request",
          },
          403: {
            description: "Admin authorization required",
          },
          404: {
            description: "Sales Order not found",
          },
          409: {
            description:
              "Dispatch exceeds ordered/reserved inventory or physical stock",
          },
        },
      },
    },

    "/api/dispatches": {
      get: {
        tags: ["Dispatch"],
        summary: "Get all dispatches",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Dispatches retrieved successfully",
          },
        },
      },
    },

    "/api/dispatches/{id}": {
      get: {
        tags: ["Dispatch"],
        summary: "Get dispatch by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          200: {
            description: "Dispatch retrieved successfully",
          },
          404: {
            description: "Dispatch not found",
          },
        },
      },
    },
  },
};

module.exports = {
  swaggerUi,
  swaggerDocument,
};
