import { Router } from "express";

import { InterviewController } from "@/controllers/interviews.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();

const controller =
  new InterviewController();

/*
 * สร้าง Google Calendar Event + Google Meet
 */
router.post(
  "/",
  authMiddleware,
  controller.create.bind(controller),
);

/*
 * ต้องวาง route เฉพาะก่อน /:id
 */
router.get(
  "/application/:applicationId",
  authMiddleware,
  controller.findByApplicationId.bind(controller),
);

/*
 * เปลี่ยนเวลา/รายละเอียดนัด
 */
router.patch(
  "/:id",
  authMiddleware,
  controller.update.bind(controller),
);

/*
 * ยกเลิก Google Calendar Event
 */
router.post(
  "/:id/cancel",
  authMiddleware,
  controller.cancel.bind(controller),
);

router.get(
  "/:id",
  authMiddleware,
  controller.findOne.bind(controller),
);

export default router;