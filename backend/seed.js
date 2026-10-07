require("dotenv").config();

const bcrypt = require("bcryptjs");
const prisma = require("./src/config/prisma");

const seed = async () => {
  const passwordHash = await bcrypt.hash("Password@123", 10);

  await prisma.user.upsert({
    where: {
      email: "admin@erpflow.com",
    },
    update: {},
    create: {
      name: "ERP Admin",
      email: "admin@erpflow.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: {
      email: "sales@erpflow.com",
    },
    update: {},
    create: {
      name: "Sales User",
      email: "sales@erpflow.com",
      passwordHash,
      role: "SALES",
    },
  });

  console.log("Users seeded successfully");
};

seed()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });