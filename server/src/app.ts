import "tsconfig-paths/register";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import fs from "fs";
import morgan from "morgan";
import path from "path";
import { connectDB } from "./config/db";
import { logger } from "./utils/logger";
import { errorMiddleware } from "./middlewares/error.middleware";

/*
 * Prisma คืน BigInt จาก MySQL BIGINT
 * ต้องแปลงเป็น String ก่อนส่ง JSON
 */
(
  BigInt.prototype as unknown as {
    toJSON: () => string;
  }
).toJSON = function (): string {
  return this.toString();
};

class App {
  public app: Application;

  constructor() {
    this.app = express();

    this.setMiddlewares();
    this.setRoutes();
    this.setNotFoundRoute();
    this.setErrorMiddleware();
  }

  private setMiddlewares(): void {
    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin) {
            callback(null, true);
            return;
          }

          const allowedOrigins = ["http://localhost:5173"];

          if (
            allowedOrigins.includes(origin) ||
            origin.startsWith("chrome-extension://")
          ) {
            callback(null, true);
            return;
          }

          callback(new Error(`Origin ${origin} is not allowed`));
        },

        credentials: true,
      }),
    );

    this.app.use(morgan("dev"));

    this.app.use(
      bodyParser.json({
        limit: "10mb",
      }),
    );

    this.app.use(
      bodyParser.urlencoded({
        extended: true,
        limit: "10mb",
      }),
    );

    this.app.use(cookieParser());

    /*
     * สำหรับ Development เท่านั้น
     *
     * Production ควรใช้ protected download endpoint
     * หรือ Signed URL จาก S3/MinIO
     */
    this.app.use(
      "/uploads",
      express.static(path.resolve(process.cwd(), "uploads")),
    );

    this.app.get("/api/health", (_req, res) => {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setRoutes(): void {
    const routesPath = path.join(__dirname, "routes");

    if (!fs.existsSync(routesPath)) {
      logger.warn(`Routes directory not found: ${routesPath}`);

      return;
    }

    const isTypeScript = __filename.endsWith(".ts");

    const extension = isTypeScript ? ".ts" : ".js";

    fs.readdirSync(routesPath).forEach((file) => {
      if (!file.endsWith(extension)) {
        return;
      }

      if (!file.includes(".route.")) {
        return;
      }

      const routeModulePath = path.join(routesPath, file);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const routeModule = require(routeModulePath);

      const route = routeModule.default;

      if (!route) {
        logger.warn(`Route file has no default export: ${file}`);

        return;
      }

      const routeName = file.replace(/\.route\.(ts|js)$/, "");

      this.app.use(`/api/${routeName}`, route);

      logger.info(`Route loaded: /api/${routeName}`);
    });
  }

  private setNotFoundRoute(): void {
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        status: 404,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setErrorMiddleware(): void {
    /*
     * Error Middleware ต้องอยู่หลัง Routes
     * และ Not Found Handler เสมอ
     */
    this.app.use(errorMiddleware);
  }

  public async listen(port: number): Promise<void> {
    try {
      await connectDB();

      this.app.listen(port, () => {
        logger.info(`🚀 Server is running on http://localhost:${port}`);
      });
    } catch (error) {
      logger.error("❌ Failed to start server:", error);

      process.exit(1);
    }
  }
}

export default App;
