import { MailModel } from "@/models/MailModel";

export class MaiService {
    async sendMail(to: string, subject: string, text: string) {
        return await MailModel.create({
            from: process.env.EMAIL_USER || "",
            to,
            subject,
            text,
            status: "sent", // หรือจะตั้งเป็น "pending" แล้วอัปเดตภายหลังถ้าเกิด error ก็ได้
        });
    }
}
