import { Router } from "express";
import { AIJobMatchController } from "@/controllers/ai-job-matches.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();

const controller = new AIJobMatchController();

router.post(
  "/application/:applicationId",
  controller.analyze.bind(controller),
);

router.get(
  "/application/:applicationId",
  controller.getResult.bind(controller),
);

export default router;
