import "dotenv/config";

import {
  PrismaPg,
} from "@prisma/adapter-pg";

import {
  PrismaClient,
} from "../generated/prisma/client";

import {
  logger,
} from "../utils/logger";

const databaseUrl =
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined",
  );
}

/*
 * Runtime connection
 *
 * ใช้ DATABASE_URL
 * ซึ่งสามารถชี้ไปที่ Supabase Transaction Pooler
 * หรือ Session Pooler ได้
 */
const adapter =
  new PrismaPg({
    connectionString:
      databaseUrl,

    /*
     * กัน Railway ค้างนาน
     * หากเชื่อมต่อ DB ไม่ได้
     */
    connectionTimeoutMillis:
      10_000,

    idleTimeoutMillis:
      30_000,

    /*
     * เริ่ม connection pool เล็กไว้ก่อน
     * เพราะ Supabase มี pooler อยู่แล้ว
     */
    max:
      5,
  });

export const prisma =
  new PrismaClient({
    adapter,
  });

export const connectDB =
  async (): Promise<void> => {
    try {
      logger.info(
        "⏳ Connecting to PostgreSQL...",
      );

      await prisma.$connect();

      logger.info(
        "✅ PostgreSQL database connected successfully",
      );
    } catch (error) {
      logger.error(
        "❌ PostgreSQL database connection failed",
        error,
      );

      throw error;
    }
  };

export const disconnectDB =
  async (): Promise<void> => {
    try {
      await prisma.$disconnect();

      logger.info(
        "🔌 PostgreSQL database disconnected",
      );
    } catch (error) {
      logger.error(
        "❌ Failed to disconnect PostgreSQL database",
        error,
      );
    }
  };