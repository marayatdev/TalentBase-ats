import { Router } from "express";
import { JobController } from "@/controllers/jobs.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();
const jobController = new JobController();

router.post("/", jobController.create.bind(jobController));

router.get("/", jobController.findAll.bind(jobController));

router.get("/:id", jobController.findOne.bind(jobController));

router.patch("/:id", jobController.update.bind(jobController));

router.delete("/:id", jobController.delete.bind(jobController));

export default router;
