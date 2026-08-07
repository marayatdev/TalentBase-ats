import { Router } from "express";
import { CandidateImportController } from "@/controllers/candidate-imports.controller";

const router = Router();

const candidateImportController = new CandidateImportController();

router.get(
  "/",
  candidateImportController.history.bind(candidateImportController),
);

router.post(
  "/parse-text",
  candidateImportController.parseText.bind(candidateImportController),
);

router.post(
  "/manual",
  candidateImportController.importManual.bind(candidateImportController),
);

router.post(
  "/analyze-post",
  candidateImportController.analyzePost.bind(candidateImportController),
);

export default router;
