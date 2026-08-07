import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

export const gemini = new GoogleGenAI({
  apiKey,
});

export const geminiModel = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

export const geminiFallbackModel =
  process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.5-flash-lite";
