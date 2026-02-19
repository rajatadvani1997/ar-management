import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // System Settings
  await prisma.systemSettings.upsert({
    where: { id: "GLOBAL" },
    update: {},
    create: {
      id: "GLOBAL",
      companyName: "AR Management Co.",
      defaultPaymentTerms: 30,
      overdueGraceDays: 0,
      watchlistThresholdPct: 80,
      highRiskOverdueDays: 60,
      brokenPromisesThreshold: 2,
      currency: "INR",
      currencySymbol: "₹",
    },
  });

  // Admin User
  const adminHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  // Collector User
  const collectorHash = await bcrypt.hash("collector123", 10);
  await prisma.user.upsert({
    where: { email: "collector@example.com" },
    update: {},
    create: {
      name: "John Collector",
      email: "collector@example.com",
      passwordHash: collectorHash,
      role: "COLLECTOR",
    },
  });

  // Viewer User
  const viewerHash = await bcrypt.hash("viewer123", 10);
  await prisma.user.upsert({
    where: { email: "viewer@example.com" },
    update: {},
    create: {
      name: "View Only",
      email: "viewer@example.com",
      passwordHash: viewerHash,
      role: "VIEWER",
    },
  });

  // Sample Customers
  const customer1 = await prisma.customer.upsert({
    where: { customerCode: "CUST-0001" },
    update: {},
    create: {
      customerCode: "CUST-0001",
      name: "ACME Corporation",
      contactPerson: "Raj Kumar",
      phone: "9876543210",
      email: "accounts@acme.com",
      address: "123 Business Park, Mumbai",
      creditLimit: 500000,
      outstandingAmt: 0,
      overdueAmt: 0,
      creditUsed: 0,
      riskFlag: "SAFE",
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { customerCode: "CUST-0002" },
    update: {},
    create: {
      customerCode: "CUST-0002",
      name: "Globex Traders",
      contactPerson: "Priya Singh",
      phone: "9123456780",
      email: "finance@globex.com",
      address: "45 Trade Center, Delhi",
      creditLimit: 200000,
      outstandingAmt: 0,
      overdueAmt: 0,
      creditUsed: 0,
      riskFlag: "SAFE",
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { customerCode: "CUST-0003" },
    update: {},
    create: {
      customerCode: "CUST-0003",
      name: "Tech Solutions Pvt Ltd",
      contactPerson: "Amit Patel",
      phone: "8899001122",
      email: "ap@techsol.in",
      address: "78 IT Park, Bangalore",
      creditLimit: 300000,
      outstandingAmt: 0,
      overdueAmt: 0,
      creditUsed: 0,
      riskFlag: "SAFE",
    },
  });

  // Sample Invoices
  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);

  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-0001" },
    update: {},
    create: {
      invoiceNumber: "INV-0001",
      customerId: customer1.id,
      invoiceDate: daysAgo(60),
      dueDate: daysAgo(30),
      paymentTermDays: 30,
      subtotal: 90000,
      taxAmount: 10000,
      totalAmount: 100000,
      paidAmount: 0,
      balanceAmount: 100000,
      status: "OVERDUE",
      lineItems: {
        create: [
          { description: "Product A", quantity: 10, unitPrice: 9000, lineTotal: 90000 },
        ],
      },
    },
  });

  const inv2 = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-0002" },
    update: {},
    create: {
      invoiceNumber: "INV-0002",
      customerId: customer1.id,
      invoiceDate: daysAgo(15),
      dueDate: daysFromNow(15),
      paymentTermDays: 30,
      subtotal: 45000,
      taxAmount: 5000,
      totalAmount: 50000,
      paidAmount: 0,
      balanceAmount: 50000,
      status: "UNPAID",
      lineItems: {
        create: [
          { description: "Service Fee", quantity: 1, unitPrice: 45000, lineTotal: 45000 },
        ],
      },
    },
  });

  const inv3 = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-0003" },
    update: {},
    create: {
      invoiceNumber: "INV-0003",
      customerId: customer2.id,
      invoiceDate: daysAgo(45),
      dueDate: daysAgo(15),
      paymentTermDays: 30,
      subtotal: 72000,
      taxAmount: 8000,
      totalAmount: 80000,
      paidAmount: 40000,
      balanceAmount: 40000,
      status: "OVERDUE",
      lineItems: {
        create: [
          { description: "Consulting", quantity: 8, unitPrice: 9000, lineTotal: 72000 },
        ],
      },
    },
  });

  const inv4 = await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-0004" },
    update: {},
    create: {
      invoiceNumber: "INV-0004",
      customerId: customer3.id,
      invoiceDate: daysAgo(10),
      dueDate: daysFromNow(20),
      paymentTermDays: 30,
      subtotal: 135000,
      taxAmount: 15000,
      totalAmount: 150000,
      paidAmount: 0,
      balanceAmount: 150000,
      status: "UNPAID",
      lineItems: {
        create: [
          { description: "Software License", quantity: 3, unitPrice: 45000, lineTotal: 135000 },
        ],
      },
    },
  });

  // Update customer totals
  await prisma.customer.update({
    where: { id: customer1.id },
    data: { outstandingAmt: 150000, overdueAmt: 100000, creditUsed: 150000, riskFlag: "WATCHLIST" },
  });
  await prisma.customer.update({
    where: { id: customer2.id },
    data: { outstandingAmt: 40000, overdueAmt: 40000, creditUsed: 40000, riskFlag: "WATCHLIST" },
  });
  await prisma.customer.update({
    where: { id: customer3.id },
    data: { outstandingAmt: 150000, overdueAmt: 0, creditUsed: 150000, riskFlag: "SAFE" },
  });

  // Sample Payment
  const payment1 = await prisma.payment.upsert({
    where: { paymentNumber: "PAY-0001" },
    update: {},
    create: {
      paymentNumber: "PAY-0001",
      customerId: customer2.id,
      paymentDate: daysAgo(10),
      amount: 40000,
      allocatedAmount: 40000,
      unallocatedAmount: 0,
      paymentMode: "NEFT",
      referenceNumber: "NEFT-123456",
      status: "APPLIED",
    },
  });

  // Allocation
  await prisma.paymentAllocation.upsert({
    where: { paymentId_invoiceId: { paymentId: payment1.id, invoiceId: inv3.id } },
    update: {},
    create: {
      paymentId: payment1.id,
      invoiceId: inv3.id,
      amount: 40000,
    },
  });

  // Sample Call Log
  await prisma.callLog.create({
    data: {
      customerId: customer1.id,
      calledById: admin.id,
      callDate: daysAgo(5),
      callStatus: "CONNECTED",
      notes: "Customer promised to pay by end of week",
      nextCallDate: daysFromNow(2),
      promiseMade: true,
    },
  });

  console.log("✅ Seeding complete!");
  console.log("\nTest accounts:");
  console.log("  Admin:     admin@example.com / admin123");
  console.log("  Collector: collector@example.com / collector123");
  console.log("  Viewer:    viewer@example.com / viewer123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
