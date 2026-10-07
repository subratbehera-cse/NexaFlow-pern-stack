# Nexaflow-pern-stack

A full-stack ERP application built using the **PERN stack (PostgreSQL, Express.js, React.js, Node.js)** to manage the complete business workflow:

**Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch**

The project is designed for a manufacturing and supply business that sells industrial products to business customers.

---

## 📌 Project Overview

This application provides a simplified ERP workflow for managing customers, enquiries, quotations, sales orders, inventory reservations, and dispatch operations.

The primary focus of the project is **correct business logic, backend authorization, database consistency, transactions, and relational database design** rather than complex UI design.

### Business Workflow

```text
Customer Enquiry
       ↓
Quotation
       ↓
Accepted Quotation
       ↓
Sales Order
       ↓
Inventory Reservation
       ↓
Dispatch
```

---

## 🚀 Key Features

### 🔐 Authentication & Authorization

* JWT-based authentication
* Password hashing
* Protected APIs
* Backend Role-Based Access Control (RBAC)
* Two user roles:

  * **ADMIN**
  * **SALES USER**

### 👨‍💼 Admin Capabilities

* View records
* Manage inventory
* Confirm Sales Orders
* Reserve inventory
* Process dispatches

### 👨‍💻 Sales User Capabilities

* Create customers/enquiries
* Create quotations
* Accept/Reject quotations
* Convert accepted quotations into Sales Orders
* View inventory availability

---

## 📋 Customer Enquiry

Sales users can create and manage customer enquiries.

### Customer Information

* Company Name
* Contact Person
* Mobile
* Email
* City

### Enquiry Information

* Enquiry Number
* Customer
* Enquiry Date
* Required Date
* Products
* Quantity
* Notes
* Status

### Enquiry Status

```text
NEW → QUOTED → WON / LOST
```

An enquiry can contain multiple products.

---

## 📦 Product & Inventory Management

The system maintains a basic Product Master.

### Product Fields

* Product Code
* Product Name
* Category
* Unit
* Base Price

The application should contain at least **6 industrial products** as sample/seed data.

### Inventory Fields

* Product
* Physical Quantity
* Reserved Quantity

### Available Quantity

```text
Available Quantity = Physical Quantity - Reserved Quantity
```

Example:

```text
Physical Quantity = 200
Reserved Quantity = 60

Available Quantity = 140
```

### Inventory Validation

The system prevents:

* Negative quantities
* Reservation beyond available stock
* Invalid inventory updates

---

## 💰 Quotation Management

Sales users can create quotations against enquiries.

### Quotation Contains

* Quotation Number
* Enquiry Reference
* Customer
* Products
* Quantity
* Unit Price
* Discount %
* GST %
* Line Amount
* Grand Total
* Valid Until
* Status

### Quotation Status

```text
DRAFT → SENT → ACCEPTED / REJECTED
```

### Quotation Calculation

For each item:

```text
Base Amount = Quantity × Unit Price
```

The discount and GST are then applied to calculate the final quotation amount.

> Important: The quotation total is calculated or validated on the **backend**. The application does not blindly trust the final amount sent by the React frontend.

---

## 🧾 Sales Order Management

An **ACCEPTED** quotation can be converted into a Sales Order.

### Sales Order Contains

* Order Number
* Customer
* Quotation Reference
* Order Date
* Products
* Quantity
* Total Amount
* Status

### Sales Order Status

```text
PENDING → CONFIRMED → DISPATCHED → CANCELLED
```

### Business Rules

* Draft quotations cannot create Sales Orders.
* Rejected quotations cannot create Sales Orders.
* One quotation cannot accidentally generate multiple Sales Orders.
* The complete relationship remains traceable:

```text
Customer
   ↓
Enquiry
   ↓
Quotation
   ↓
Sales Order
```

---

## 🏭 Inventory Reservation

When an Admin confirms a Sales Order, the system checks inventory availability.

### Example

```text
Physical Quantity = 100
Reserved Quantity = 30

Available Quantity = 100 - 30
                   = 70
```

If the order requires **80 units**, confirmation is rejected because only 70 units are available.

If the order requires **60 units**:

```text
Before:

Physical = 100
Reserved = 30
Available = 70


After Reservation:

Physical = 100
Reserved = 90
Available = 10
```

### Important Rule

Physical inventory does **not** decrease during reservation.

Only the reserved quantity increases.

---

## 🔒 Concurrent Inventory Reservation

The backend handles simultaneous reservation requests at the database/backend level.

Example:

```text
Available Inventory = 100

User A → Reserve 80
User B → Reserve 50
```

Both reservations must not succeed.

The system uses appropriate database-level techniques/transactions to maintain inventory consistency.

A frontend-only stock check is not sufficient.

---

## 🚚 Dispatch Management

Admins can dispatch confirmed Sales Orders.

### Dispatch Information

* Dispatch Number
* Sales Order
* Dispatch Date
* Products
* Quantity
* Vehicle Number
* Driver Name

When stock is dispatched:

```text
Physical Quantity decreases
        +
Reserved Quantity decreases
```

### Example

Before dispatch:

```text
Physical = 100
Reserved = 60
Available = 40
```

Dispatch:

```text
60 units
```

After dispatch:

```text
Physical = 40
Reserved = 0
Available = 40
```

### Dispatch Validation

The system prevents:

* Dispatch beyond reserved quantity
* Duplicate dispatch of the same quantity
* Dispatch of cancelled orders

---

# 🖥️ Application Screens

The application contains the following main screens:

### 1. Login

User authentication using JWT.

### 2. Enquiries

* Create enquiries
* View enquiries

### 3. Quotations

* Create quotations
* View quotations
* Accept/Reject quotations

### 4. Sales Orders

* View orders
* Check stock availability
* Confirm orders
* Reserve inventory
* Process dispatch

Inventory availability can be displayed within the Sales Order screen or in a small separate section.

---

# 🛠️ Tech Stack

## Frontend

* React.js
* JavaScript
* HTML5
* CSS3

## Backend

* Node.js
* Express.js
* REST APIs
* JWT Authentication
* Backend RBAC
* Validation
* Error Handling

## Database

* PostgreSQL
* Relational Database Design
* Foreign Keys
* Constraints
* Transactions

## ORM

`[Prisma / Sequelize / Drizzle / Knex]`

> Replace this with the ORM actually used in the project.

---

# 🗄️ Database Structure

The application follows a relational database design.

Main entities include:

```text
users
customers
products
inventory
enquiries
enquiry_items
quotations
quotation_items
sales_orders
sales_order_items
dispatches
```

### Relationship Overview

```text
Users
 │
 ├── Customers
 │      │
 │      └── Enquiries
 │             │
 │             └── Enquiry Items
 │
 └── Quotations
        │
        └── Quotation Items
               │
               ↓
          Sales Orders
               │
               └── Sales Order Items
                       │
                       ↓
                   Dispatches

Products
   │
   └── Inventory
```

The database uses:

* Foreign keys
* Unique constraints
* Validation constraints
* Relational relationships
* Transactions where required

---

# 🔌 REST API

Example API endpoints:

### Authentication

```http
POST /auth/login
```

### Enquiries

```http
POST /enquiries
GET /enquiries
```

### Quotations

```http
POST /quotations
PATCH /quotations/:id/status
POST /quotations/:id/convert
```

### Sales Orders

```http
GET /sales-orders
POST /sales-orders/:id/confirm
POST /sales-orders/:id/dispatch
```

> Update these endpoints if the actual implementation uses different routes.

---

# 🔑 Environment Variables

Create a `.env` file in the backend directory.

```env
PORT=5000

DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/DATABASE_NAME

JWT_SECRET=your_jwt_secret

NODE_ENV=development
```

### Frontend Environment Variables

Example:

```env
VITE_API_URL=http://localhost:5000
```

> Never commit `.env` files or secret credentials to GitHub.

---

# ⚙️ Installation & Setup

## Prerequisites

Make sure the following are installed:

* Node.js
* npm
* PostgreSQL
* Git

---

## 1. Clone Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

```bash
cd <PROJECT_DIRECTORY>
```

---

# 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create the environment file:

```bash
.env
```

Add the required database and JWT configuration.

---

# 3. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE erp_system;
```

Configure the database connection inside `.env`.

Example:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/erp_system
```

---

# 4. Database Migration

Run the project's migration command:

```bash
<YOUR_MIGRATION_COMMAND>
```

Example for Prisma:

```bash
npx prisma migrate dev
```

---

# 5. Seed Sample Data

Seed the database with sample products and users:

```bash
<YOUR_SEED_COMMAND>
```

Example:

```bash
npm run seed
```

The seed data should include at least six industrial products.

---

# 6. Start Backend

```bash
npm run dev
```

Backend will run on:

```text
http://localhost:5000
```

---

# 7. Frontend Setup

Open a new terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create the frontend `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

Start the React application:

```bash
npm run dev
```

The frontend will normally run on:

```text
http://localhost:5173
```

---

# 🧪 Automated Tests

The project includes at least five automated tests covering important business rules.

### Test 1 — Quotation Calculation

Verifies that the quotation total is calculated correctly.

### Test 2 — Invalid Quotation Conversion

Verifies that:

* DRAFT quotation cannot create a Sales Order.
* REJECTED quotation cannot create a Sales Order.

### Test 3 — Duplicate Sales Order

Verifies that the same quotation cannot generate multiple Sales Orders.

### Test 4 — Inventory Reservation

Verifies that the system cannot reserve more inventory than is available.

### Test 5 — Authorization

Verifies that an unauthorized user cannot perform restricted operations.

### Bonus Test

Concurrent inventory reservations can also be tested to verify that simultaneous requests cannot oversell available inventory.

---

# ▶️ Run Tests

```bash
npm test
```

Or use the project's configured test command:

```bash
<YOUR_TEST_COMMAND>
```

---

# 👤 Test Login Credentials

### Admin

```text
Email: <ADMIN_EMAIL>
Password: <ADMIN_PASSWORD>
```

### Sales User

```text
Email: <SALES_USER_EMAIL>
Password: <SALES_USER_PASSWORD>
```

> Replace these placeholders with the credentials created by your seed script.

---

# 📮 API Documentation

API documentation is available through:

* Postman / Swagger / equivalent

Documentation link:

```text
<YOUR_POSTMAN_OR_SWAGGER_LINK>
```

---

# 📊 Demo Workflow

The complete application workflow can be demonstrated as:

```text
Login
  ↓
Create Customer Enquiry
  ↓
Create Quotation
  ↓
Accept Quotation
  ↓
Convert to Sales Order
  ↓
Admin Confirms Sales Order
  ↓
Inventory Reservation
  ↓
Dispatch
  ↓
Inventory Updated
```

---

# 🔐 Security

The application implements:

* JWT authentication
* Password hashing
* Protected backend APIs
* Backend role-based authorization
* Request validation
* Business-rule validation
* Environment-based configuration

Frontend role restrictions alone are not relied upon for security.

---

# 🧠 Business Logic Highlights

The project focuses heavily on maintaining data consistency.

### Quotation

```text
Quantity × Unit Price
        ↓
Discount
        ↓
GST
        ↓
Final Amount
```

### Inventory

```text
Available = Physical - Reserved
```

### Reservation

```text
Physical → unchanged
Reserved → increased
Available → decreased
```

### Dispatch

```text
Physical → decreased
Reserved → decreased
Available → recalculated
```

---

# 📁 Project Structure

Example structure:

```text
erp-system/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   │
│   ├── tests/
│   ├── package.json
│   └── .env
│
├── database/
│   └── migrations/
│
├── README.md
└── .gitignore
```

> Adjust the structure according to the actual implementation.

---

# 🎥 Demo Video

The demo video demonstrates the complete workflow within approximately 5 minutes:

```text
Login
→ Enquiry
→ Quotation
→ Sales Order
→ Inventory Reservation
→ Dispatch
```

---

# 🧑‍💻 Development History

The repository contains incremental commits demonstrating the development process rather than submitting the entire project as a single final commit.

Example:

```text
Initial project setup
        ↓
Database schema
        ↓
Authentication & RBAC
        ↓
Enquiry module
        ↓
Quotation module
        ↓
Sales Order module
        ↓
Inventory reservation
        ↓
Dispatch
        ↓
Testing
        ↓
Final improvements
```

---

# 🔮 Possible Future Enhancements

The system can be extended with additional ERP features such as:

* Purchase Orders
* Supplier Management
* Invoice Management
* Payment Tracking
* Advanced Reporting
* Audit Logs
* Dashboard Analytics
* Email Notifications
* PDF Quotation Generation
* Advanced Inventory Reports

---

# ⚠️ Important Business Rules

The following rules are enforced by the application:

1. Draft quotations cannot create Sales Orders.
2. Rejected quotations cannot create Sales Orders.
3. A quotation cannot create duplicate Sales Orders.
4. Inventory cannot become negative.
5. Reservation cannot exceed available stock.
6. Physical inventory does not decrease during reservation.
7. Dispatch cannot exceed reserved quantity.
8. Cancelled orders cannot be dispatched.
9. Restricted operations require proper backend authorization.
10. Business-critical operations use database transactions where required.

---

# 📌 Assignment Requirements Covered

| Requirement                  | Status      |
| ---------------------------- | ----------- |
| React.js                     | ✅           |
| Node.js                      | ✅           |
| Express.js                   | ✅           |
| PostgreSQL                   | ✅           |
| REST APIs                    | ✅           |
| JWT Authentication           | ✅           |
| Backend RBAC                 | ✅           |
| Validation                   | ✅           |
| Error Handling               | ✅           |
| Relational Database          | ✅           |
| Transactions                 | ✅           |
| Automated Tests              | ✅           |
| Database Schema / ER Diagram | 🔗 Add Link |
| API Documentation            | 🔗 Add Link |
| Demo Video                   | 🔗 Add Link |

---

# 👨‍💻 Author

**Subrat Behera**

B.Tech Computer Science & Engineering

GitHub: https://github.com/subratbehera-cse

LinkedIn: https://www.linkedin.com/in/subrat-behera-098365311

---

## 📄 License

This project was developed as a technical case-study project for demonstrating full-stack development, backend business logic, database design, authentication, authorization, and inventory management.
