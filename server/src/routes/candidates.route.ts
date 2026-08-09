import { Router } from "express";
import { CandidateController } from "@/controllers/candidates.controller";
import { uploadResume } from "@/middlewares/resume-upload.middleware";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();

const candidateController = new CandidateController();

router.post(
  "/with-resume",
  uploadResume.single("resume"),
  candidateController.createWithResume.bind(candidateController),
);

/*
 * routes เดิม
 */
router.post("/", authMiddleware, candidateController.create.bind(candidateController));

router.get("/", authMiddleware, candidateController.findAll.bind(candidateController));

router.get("/:id", authMiddleware, candidateController.findOne.bind(candidateController));

router.patch("/:id", authMiddleware, candidateController.update.bind(candidateController));

router.delete("/:id", authMiddleware, candidateController.delete.bind(candidateController));

export default router;
