import { Router } from "express";
import { JobController } from "@/controllers/jobs.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";
import { CandidateSearchQueryController } from "@/controllers/candidate-search-query.controller";

const router = Router();
const jobController = new JobController();
const candidateSearchQueryController =
    new CandidateSearchQueryController();


router.post("/", jobController.create.bind(jobController));

router.get("/", jobController.findAll.bind(jobController));

router.get("/:id", jobController.findOne.bind(jobController));

router.patch("/:id", jobController.update.bind(jobController));

router.delete("/:id", jobController.delete.bind(jobController));

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
