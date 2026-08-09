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
  resumeController.findByCandidate.bind(resumeController),
);

router.get(
  "/:id",
  resumeController.findOne.bind(resumeController),
);

router.patch(
  "/:id/primary",
  resumeController.setPrimary.bind(resumeController),
);

router.delete(
  "/:id",
  resumeController.delete.bind(resumeController),
);

export default router;
