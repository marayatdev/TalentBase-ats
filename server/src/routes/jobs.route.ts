import { Router } from "express";
import { JobController } from "@/controllers/jobs.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";
import { CandidateSearchQueryController } from "@/controllers/candidate-search-query.controller";

const router = Router();
const jobController = new JobController();
const candidateSearchQueryController =
    new CandidateSearchQueryController();


router.post("/", authMiddleware, jobController.create.bind(jobController));

router.get("/", authMiddleware, authMiddleware, jobController.findAll.bind(jobController));

router.get("/:id", authMiddleware, jobController.findOne.bind(jobController));

router.patch("/:id", authMiddleware, jobController.update.bind(jobController));

router.delete("/:id", authMiddleware, jobController.delete.bind(jobController));

/*
 * search-queries extention
 */

router.post(
    "/:jobId/search-queries",
    authMiddleware,
    candidateSearchQueryController.generate.bind(
        candidateSearchQueryController,
    ),
);


export default router;
