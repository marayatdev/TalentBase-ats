import { Router } from "express";
import { AIResumeController } from "@/controllers/ai-resumes.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();

const aiResumeController = new AIResumeController();

router.post(
  "/:resumeId/parse",
  authMiddleware,
  aiResumeController.parse.bind(aiResumeController),
);

router.get(
  "/:resumeId/result",
  authMiddleware,
  aiResumeController.getResult.bind(aiResumeController),
);

export default router;
