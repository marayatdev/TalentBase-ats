import { Request, Response } from "express";
import { logger } from "@/utils/logger";
import { MaiService } from "@/services/mail.service";
import { ResponseFormatter } from "@/utils/response";
import nodemailer from "nodemailer";
import { MailModel } from "@/models/MailModel";

export class MailController {

    private mailService: MaiService;
    private emailUser: string;
    private emailPass: string;

    constructor() {
        this.mailService = new MaiService();
        this.emailUser = process.env.EMAIL_USER || "marayat.dev@gmail.com"; // คีย์สำหรับการเข้าถึงอีเมล
        this.emailPass = process.env.EMAIL_PASS || "sqidsccgnnqbeiqx"; // รหัสผ่านหรือตัวแปร app password
    }

    public sendMail = async (req: Request, res: Response) => {
        const { to, subject, text } = req.body;
        try {

            if (!to || !subject || !text) {
                ResponseFormatter.error(
                    res,
                    "Missing required fields: to, subject, text",
                    400
                );
                logger.error("Missing required fields for sending email");
                return;
            }

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            const mailOptions = {
                from: `"Prortfolio Marayat Dev: " <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html: `<p>สวัสดี <strong>คุณผู้ใช้</strong>,<br> นี่คืออีเมลอัตโนมัติจากระบบของเรา</p>`
            };

            console.log("Sending email with options:", mailOptions);

            await transporter.sendMail(mailOptions);

            await this.mailService.sendMail(to, subject, text);
            res.status(200).json({ message: "Email sent successfully" });
        } catch (error) {
            logger.error("Error sending email:", error);
            await MailModel.create({
                from: process.env.EMAIL_USER || "",
                to,
                subject,
                text,
                status: "failed",
            });
            res.status(500).json({ error: "Failed to send email" });
        }
    };

}
