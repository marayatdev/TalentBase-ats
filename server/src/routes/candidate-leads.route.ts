import { Router } from "express";
import { CandidateLeadController } from "@/controllers/candidate-leads.controller";

const router = Router();

const controller = new CandidateLeadController();

router.post("/", controller.create.bind(controller));

router.get("/", controller.findAll.bind(controller));

/*
 * ต้องวาง /:id/convert ก่อน /:id
 */
router.post("/:id/convert", controller.convert.bind(controller));

router.patch("/:id", controller.update.bind(controller));

router.get("/:id", controller.findOne.bind(controller));

export default router;
