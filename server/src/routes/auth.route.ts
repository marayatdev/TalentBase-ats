import { Router } from "express";
import { AuthController } from "@/controllers/auth.controller";

const router = Router();
const authController = new AuthController();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

router.get("/me", authController.me);

router.post(
    "/extension-login",
    authController.extensionLogin,
);

export default router;
