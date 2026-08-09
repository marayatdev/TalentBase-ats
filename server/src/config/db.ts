import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

import { logger } from "../utils/logger";

const databaseUrl =
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined in .env",
  );
}

/*
 * Prisma 7 + PostgreSQL
 *
 * DATABASE_URL จะใช้ connection string
 * ของ Supabase PostgreSQL
 */
const adapter =
  new PrismaPg({
    connectionString:
      databaseUrl,
  });

export const prisma =
  new PrismaClient({
    adapter,
  });

export const connectDB =
  async (): Promise<void> => {
    try {
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