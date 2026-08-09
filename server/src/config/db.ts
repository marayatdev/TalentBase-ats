import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

import { logger } from "../utils/logger";

const databaseUrl =
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined",
  );
}

const adapter =
  new PrismaPg({
    connectionString:
      databaseUrl,

    /*
     * สำคัญสำหรับ Railway
     * อย่าปล่อยให้ DB connection ค้างไม่มีกำหนด
     */
    connectionTimeoutMillis:
      10_000,

    idleTimeoutMillis:
      30_000,

    /*
     * เริ่มเล็กก่อนเพราะมี Supabase pooler อยู่แล้ว
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