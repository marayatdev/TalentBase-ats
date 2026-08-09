import { Router } from "express";

import { GoogleAuthController } from "@/controllers/google-auth.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();
const controller = new GoogleAuthController();

router.get(
  "/auth-url",
  controller.getAuthUrl.bind(controller),
);

/*
 * Google redirect เข้ามาโดยไม่มี JWT cookie เสมอไป
 * เราจึงใช้ state เพื่อหา user
 */
router.get(
  "/oauth/callback",
  controller.callback.bind(controller),
);

router.get(
  "/connection",
  controller.connection.bind(controller),
);

router.delete(
  "/connection",
  controller.disconnect.bind(controller),
);

export default router;