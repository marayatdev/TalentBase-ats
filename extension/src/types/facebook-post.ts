/*
 * =========================================================
 * FACEBOOK POST
 * =========================================================
 */

export interface FacebookPost {
  /*
   * Post ID
   *
   * ถ้าหา Facebook URL ได้
   * จะใช้ URL เป็น ID
   */
  id: string;

  /*
   * ชื่อเจ้าของโพสต์
   */
  author: string | null;

  /*
   * เนื้อหาโพสต์
   */
  text: string;

  /*
   * URL ของ Facebook Post
   */
  url: string | null;

  /*
   * เวลาที่อ่านได้จาก Facebook โดยตรง
   *
   * ตัวอย่าง:
   *
   * "3 วัน"
   * "2 ชม."
   * "1 สัปดาห์"
   * "5 สิงหาคม เวลา 14:30"
   */
  createdAt: string | null;

  /*
   * เวลาที่ parser แปลงแล้วเป็น ISO 8601
   *
   * ตัวอย่าง:
   *
   * "2026-08-08T10:30:00.000Z"
   *
   * ใช้ field นี้สำหรับ:
   *
   * - filter Last 1 day
   * - filter Last 3 days
   * - filter Last 7 days
   * - filter Last 14 days
   * - filter Last 30 days
   */
  createdAtDate: string | null;
}

/*
 * =========================================================
 * FACEBOOK POST MATCH
 * =========================================================
 */

export interface FacebookPostMatch
  extends FacebookPost {
  /*
   * Keyword ที่ local filter ตรวจพบ
   */
  matchedKeywords: string[];

  /*
   * คะแนนจาก local filter
   */
  score: number;

  /*
   * ผ่าน local filter หรือไม่
   */
  isMatched: boolean;
}

/*
 * =========================================================
 * FACEBOOK FILTER CONFIG
 * =========================================================
 */

export interface FacebookFilterConfig {
  /*
   * ตำแหน่งที่กำลังค้นหา
   *
   * เช่น:
   * Backend Developer
   */
  position: string;

  /*
   * Keywords ของตำแหน่ง
   */
  positionKeywords: string[];

  /*
   * Keyword ที่บ่งบอกว่า
   * เจ้าของโพสต์กำลังหางาน
   */
  jobSeekingKeywords: string[];

  /*
   * Keyword ที่ใช้ตัดโพสต์ประเภท
   * Recruiter / Hiring / Advertisement
   */
  excludeKeywords: string[];

  /*
   * คะแนนขั้นต่ำสำหรับ local matching
   */
  minimumScore: number;
}

/*
 * =========================================================
 * POST AGE FILTER
 * =========================================================
 */

/*
 * ค่าที่ใช้ใน Popup
 */
export type PostAgeFilter =
  | "any"
  | "1"
  | "3"
  | "7"
  | "14"
  | "30";

/*
 * Configuration ที่เก็บใน
 * chrome.storage.local
 */
export interface FacebookPostAgeConfig {
  /*
   * null = Any time
   *
   * 1  = Last 1 day
   * 3  = Last 3 days
   * 7  = Last 7 days
   * 14 = Last 14 days
   * 30 = Last 30 days
   */
  maxAgeDays: number | null;
}

/*
 * =========================================================
 * AI CANDIDATE ANALYSIS
 * =========================================================
 */

export interface CandidatePostAnalysis {
  /*
   * โพสต์นี้เป็น Candidate
   * ที่กำลังหางานหรือไม่
   */
  is_job_seeker: boolean;

  /*
   * Candidate ตรงกับ Job
   * ที่ HR เลือกหรือไม่
   */
  matches_target_position: boolean;

  /*
   * ตำแหน่งที่ AI ตรวจพบ
   * จากโพสต์
   */
  detected_position: string | null;

  /*
   * ตำแหน่ง Job เป้าหมาย
   */
  target_position: string;

  /*
   * AI confidence
   * 0 - 100
   */
  confidence: number;

  /*
   * เหตุผลจาก AI
   */
  reason: string;

  /*
   * Candidate information
   *
   * ห้าม AI เดาข้อมูลที่ไม่มี
   */
  full_name: string | null;

  email: string | null;

  phone: string | null;

  /*
   * Skills ที่พบจริงในโพสต์
   */
  skills: string[];

  /*
   * Source
   */
  source: "facebook";

  /*
   * Facebook Post URL
   */
  source_url: string | null;
}

/*
 * =========================================================
 * API RESPONSE
 * =========================================================
 */

export interface ApiSuccess<T> {
  success: true;

  status: number;

  message: string;

  data: T;

  timestamp: string;
}