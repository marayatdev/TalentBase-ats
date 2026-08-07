import { Router } from "express";
import { CandidateController } from "@/controllers/candidates.controller";
import { uploadResume } from "@/middlewares/resume-upload.middleware";

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
router.post("/", candidateController.create.bind(candidateController));

router.get("/", candidateController.findAll.bind(candidateController));

router.get("/:id", candidateController.findOne.bind(candidateController));

router.patch("/:id", candidateController.update.bind(candidateController));

router.delete("/:id", candidateController.delete.bind(candidateController));

export default router;
