import { Router } from "express";
import { CandidateLeadController } from "@/controllers/candidate-leads.controller";
import { authMiddleware } from "@/middlewares/authMiddleware";

const router = Router();

const controller = new CandidateLeadController();

router.post("/", controller.create.bind(controller));

router.get("/", controller.findAll.bind(controller));

/*
 * ต้องวาง /:id/convert ก่อน /:id
 */
router.post("/:id/convert", authMiddleware, controller.convert.bind(controller));

router.patch("/:id", authMiddleware, controller.update.bind(controller));

router.get("/:id", authMiddleware, controller.findOne.bind(controller));

export default router;
