import { Router } from "express";
import { ResumeController } from "@/controllers/resumes.controller";

import { authMiddleware } from "@/middlewares/authMiddleware";
import { uploadResume } from "@/middlewares/resume-upload.middleware";

const router = Router();
const resumeController = new ResumeController();

router.post(
  "/candidate/:candidateId",
  uploadResume.single("resume"),
  resumeController.upload.bind(resumeController),
);

router.get(
  "/candidate/:candidateId",
  authMiddleware,
  resumeController.findByCandidate.bind(resumeController),
);

router.get(
  "/:id",
  authMiddleware,
  resumeController.findOne.bind(resumeController),
);

router.patch(
  "/:id/primary",
  authMiddleware,
  resumeController.setPrimary.bind(resumeController),
);

router.delete(
  "/:id", authMiddleware,
  resumeController.delete.bind(resumeController),
);

export default router;
