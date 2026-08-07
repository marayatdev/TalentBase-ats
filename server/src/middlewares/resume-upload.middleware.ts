import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { AppError } from "@/utils/app-error";

const uploadDirectory = path.resolve(process.cwd(), "uploads", "resumes");

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const uniqueName = [Date.now(), crypto.randomUUID()].join("-");

    callback(null, `${uniqueName}${extension}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const uploadResume = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError("รองรับเฉพาะไฟล์ PDF และ DOCX", 400));

      return;
    }

    callback(null, true);
  },
});
