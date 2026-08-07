// yarn ts-node -r tsconfig-paths/register src/test/test-gemini.ts ทดสอบ model gemini 3.6-flash ของ google genai

import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing");
}

const ai = new GoogleGenAI({
  apiKey,
});

const models = [
  process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
  process.env.GEMINI_FALLBACK_MODEL ?? "gemini-3.1-flash-lite",
  process.env.GEMINI_SECOND_FALLBACK_MODEL ?? "gemini-2.5-flash-lite",
];

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getErrorStatus = (error: unknown): number | undefined => {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
};

const isRetryableError = (error: unknown): boolean => {
  const status = getErrorStatus(error);

  if (status === 429 || status === 500 || status === 503) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("UNAVAILABLE") ||
    message.includes("high demand") ||
    message.includes("RESOURCE_EXHAUSTED")
  );
};

async function generateWithRetry(
  model: string,
  maxAttempts = 3,
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Testing ${model}, attempt ${attempt}/${maxAttempts}`);

      const response = await ai.models.generateContent({
        model,
        contents: "ตอบ JSON ว่า API ใช้งานได้",
        config: {
          responseMimeType: "application/json",
        },
      });

      if (!response.text) {
        throw new Error("Gemini returned an empty response");
      }

      return response.text;
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error)) {
        throw error;
      }

      if (attempt < maxAttempts) {
        const waitMs = 1000 * 2 ** (attempt - 1);

        console.warn(`${model} unavailable. Retrying in ${waitMs} ms`);

        await delay(waitMs);
      }
    }
  }

  throw lastError;
}

async function main(): Promise<void> {
  let lastError: unknown;

  for (const model of models) {
    try {
      const result = await generateWithRetry(model);

      console.log(`Success with model: ${model}`);
      console.log(result);

      return;
    } catch (error) {
      lastError = error;

      console.error(`Model failed: ${model}`);

      if (!isRetryableError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

main().catch((error) => {
  console.error("All Gemini models failed:", error);
  process.exit(1);
});
