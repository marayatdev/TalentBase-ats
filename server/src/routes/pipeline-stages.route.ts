import { Router } from "express";
import { PipelineStageController } from "@/controllers/pipeline-stages.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();

const controller = new PipelineStageController();

router.post("/", authMiddleware, controller.create.bind(controller));

router.post(
  "/default/:jobId",
  authMiddleware,
  controller.createDefault.bind(controller),
);

router.get(
  "/job/:jobId",
  authMiddleware,
  controller.findByJob.bind(controller),
);

router.patch(
  "/job/:jobId/reorder",
  authMiddleware,
  controller.reorder.bind(controller),
);

/*
 * Dynamic /:id ต้องอยู่หลัง route ที่ขึ้นต้นด้วย /job
 */
router.get("/:id", authMiddleware, controller.findOne.bind(controller));

router.patch("/:id", authMiddleware, controller.update.bind(controller));

router.delete("/:id", authMiddleware, controller.delete.bind(controller));

export default router;
