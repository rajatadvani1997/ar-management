import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

// DATABASE_URL from .env is "file:./dev.db" — relative to project root
const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const relativePath = dbUrl.replace(/^file:/, "");
const dbPath = path.isAbsolute(relativePath)
  ? relativePath
  : path.join(process.cwd(), relativePath);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
