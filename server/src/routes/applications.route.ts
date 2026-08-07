import { Router } from "express";
import { ApplicationController } from "@/controllers/applications.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();

const applicationController = new ApplicationController();

router.post(
  "/",
  authMiddleware,
  applicationController.create.bind(applicationController),
);

router.get(
  "/",
  authMiddleware,
  applicationController.findAll.bind(applicationController),
);

router.get(
  "/:id",
  authMiddleware,
  applicationController.findOne.bind(applicationController),
);

router.patch(
  "/:id/status",
  authMiddleware,
  applicationController.updateStatus.bind(applicationController),
);

router.patch(
  "/:id/move-stage",
  authMiddleware,
  applicationController.moveStage.bind(applicationController),
);

router.delete(
  "/:id",
  authMiddleware,
  applicationController.delete.bind(applicationController),
);

export default router;
