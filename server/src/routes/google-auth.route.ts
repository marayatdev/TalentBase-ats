import { Router } from "express";

import { GoogleAuthController } from "@/controllers/google-auth.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();
const controller = new GoogleAuthController();

router.get(
  "/auth-url",
  authMiddleware,
  controller.getAuthUrl.bind(controller),
);

/*
 * Google redirect เข้ามาโดยไม่มี JWT cookie เสมอไป
 * เราจึงใช้ state เพื่อหา user
 */
router.get(
  "/oauth/callback",
  authMiddleware,
  controller.callback.bind(controller),
);

router.get(
  "/connection",
  authMiddleware,
  controller.connection.bind(controller),
);

router.delete(
  "/connection",
  authMiddleware,
  controller.disconnect.bind(controller),
);

export default router;