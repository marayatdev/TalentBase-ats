import { MailController } from "@/controllers/mail.controller";
import { Router } from "express";

const router = Router();
const mailController = new MailController();

router.post("/", mailController.sendMail);

export default router;
