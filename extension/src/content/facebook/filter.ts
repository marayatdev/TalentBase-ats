import type {
  FacebookFilterConfig,
  FacebookPost,
  FacebookPostMatch,
} from "../../types/facebook-post";

export const defaultFilterConfig: FacebookFilterConfig = {
  position: "Backend Developer",

  positionKeywords: [
    "backend",
    "back-end",
    "backend developer",
    "node.js",
    "nodejs",
    "nestjs",
    "express",
    "typescript",
    "api developer",
    "server-side",
    "golang",
    "go developer",
    "java",
    "spring boot",
    "โปรแกรมเมอร์ backend",
    "นักพัฒนา backend",
  ],

  jobSeekingKeywords: [
    "หางาน",
    "กำลังหางาน",
    "มองหางาน",
    "สนใจงาน",
    "สมัครงาน",
    "ฝากประวัติ",
    "ฝากโปรไฟล์",
    "ฝาก resume",
    "ฝาก cv",
    "พร้อมเริ่มงาน",
    "open to work",
    "looking for work",
    "looking for a job",
    "seeking opportunities",
    "available for work",
    "available immediately",
  ],

  excludeKeywords: [
    "รับสมัคร",
    "เปิดรับสมัคร",
    "ประกาศรับสมัคร",
    "บริษัทกำลังหา",
    "hiring",
    "we are hiring",
    "job vacancy",
    "รับคน",
    "รับพนักงาน",
  ],

  minimumScore: 5,
};

function normalizeText(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function filterFacebookPost(
  post: FacebookPost,
  config: FacebookFilterConfig,
): FacebookPostMatch {
  const text = normalizeText(post.text);

  const matchedPositionKeywords = config.positionKeywords.filter((keyword) =>
    text.includes(normalizeText(keyword)),
  );

  const matchedJobSeekingKeywords = config.jobSeekingKeywords.filter(
    (keyword) => text.includes(normalizeText(keyword)),
  );

  const matchedExcludeKeywords = config.excludeKeywords.filter((keyword) =>
    text.includes(normalizeText(keyword)),
  );

  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(post.text);

  const hasPhone = /(?:\+66|0)[0-9\s()-]{8,14}/.test(post.text);

  const hasResumeKeyword =
    text.includes("resume") ||
    text.includes("cv") ||
    text.includes("portfolio") ||
    text.includes("เรซูเม่") ||
    text.includes("พอร์ต");

  let score = 0;

  score += Math.min(matchedPositionKeywords.length * 2, 6);
  score += Math.min(matchedJobSeekingKeywords.length * 3, 6);

  if (hasEmail) {
    score += 1;
  }

  if (hasPhone) {
    score += 1;
  }

  if (hasResumeKeyword) {
    score += 1;
  }

  if (post.url) {
    score += 1;
  }

  score -= matchedExcludeKeywords.length * 5;

  const isMatched =
    matchedPositionKeywords.length > 0 &&
    matchedJobSeekingKeywords.length > 0 &&
    matchedExcludeKeywords.length === 0 &&
    score >= config.minimumScore;

  return {
    ...post,

    matchedKeywords: unique([
      ...matchedPositionKeywords,
      ...matchedJobSeekingKeywords,
    ]),

    score,
    isMatched,
  };
}
