import { Router } from "express";
import { ApplicationController } from "@/controllers/applications.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();

const applicationController = new ApplicationController();

router.post(
  "/",
  applicationController.create.bind(applicationController),
);

router.get(
  "/",
  applicationController.findAll.bind(applicationController),
);

router.get(
  "/:id",
  applicationController.findOne.bind(applicationController),
);

router.patch(
  "/:id/status",
  applicationController.updateStatus.bind(applicationController),
);

router.patch(
  "/:id/move-stage",
  applicationController.moveStage.bind(applicationController),
);

router.delete(
  "/:id",
  applicationController.delete.bind(applicationController),
);

export default router;
