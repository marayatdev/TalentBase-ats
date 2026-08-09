import { Router } from "express";
import { CandidateImportController } from "@/controllers/candidate-imports.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();

const candidateImportController = new CandidateImportController();

router.get(
  "/",
  authMiddleware,
  candidateImportController.history.bind(candidateImportController),
);

router.post(
  "/parse-text",
  authMiddleware,
  candidateImportController.parseText.bind(candidateImportController),
);

router.post(
  "/manual",
  authMiddleware,
  candidateImportController.importManual.bind(candidateImportController),
);

router.post(
  "/analyze-post",
  authMiddleware,
  candidateImportController.analyzePost.bind(candidateImportController),
);

export default router;
