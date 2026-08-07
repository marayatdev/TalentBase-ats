import { Schema, model } from "mongoose";

const MailSchema = new Schema(
    {
        from: { type: String, required: true },
        to: { type: String, required: true },
        subject: { type: String, required: true },
        text: { type: String, required: true },
        status: { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    },
    { timestamps: true }
);

export const MailModel = model("Mail", MailSchema);