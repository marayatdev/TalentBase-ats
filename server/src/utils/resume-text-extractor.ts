import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { AppError } from "@/utils/app-error";

export class ResumeTextExtractor {
  async extract(fileUrl: string, mimeType?: string | null): Promise<string> {
    const absolutePath = this.resolveFilePath(fileUrl);

    const fileExists = await this.checkFileExists(absolutePath);

    if (!fileExists) {
      throw new AppError("ไม่พบไฟล์ Resume ในระบบ", 404);
    }

    const extension = path.extname(absolutePath).toLowerCase();

    let text: string;

    if (mimeType === "application/pdf" || extension === ".pdf") {
      text = await this.extractPdf(absolutePath);
    } else if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      extension === ".docx"
    ) {
      text = await this.extractDocx(absolutePath);
    } else {
      throw new AppError("รองรับการอ่านเฉพาะไฟล์ PDF และ DOCX", 400);
    }

    const normalizedText = this.normalizeText(text);

    if (!normalizedText) {
      throw new AppError(
        "ไม่สามารถอ่านข้อความจาก Resume ได้ อาจเป็น PDF แบบสแกนรูปภาพ",
        422,
      );
    }

    return normalizedText;
  }

  private async extractPdf(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);

    const parser = new PDFParse({
      data: buffer,
    });

    try {
      const result = await parser.getText();

      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  private async extractDocx(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);

    const result = await mammoth.extractRawText({
      buffer,
    });

    return result.value;
  }

  private resolveFilePath(fileUrl: string): string {
    const relativePath = fileUrl.replace(/^\/uploads\//, "");

    const uploadsDirectory = path.resolve(process.cwd(), "uploads");

    const absolutePath = path.resolve(uploadsDirectory, relativePath);

    if (!absolutePath.startsWith(uploadsDirectory)) {
      throw new AppError("ตำแหน่งไฟล์ Resume ไม่ถูกต้อง", 400);
    }

    return absolutePath;
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\u0000/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private async checkFileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
