export interface FacebookPost {
  id: string;
  author: string | null;
  text: string;
  url: string | null;
  createdAt: string | null;
}

export interface FacebookPostMatch extends FacebookPost {
  matchedKeywords: string[];
  score: number;
  isMatched: boolean;
}

export interface FacebookFilterConfig {
  position: string;
  positionKeywords: string[];
  jobSeekingKeywords: string[];
  excludeKeywords: string[];
  minimumScore: number;
}
export interface CandidatePostAnalysis {
  is_job_seeker: boolean;
  matches_target_position: boolean;

  detected_position: string | null;
  target_position: string;

  confidence: number;
  reason: string;

  full_name: string | null;
  email: string | null;
  phone: string | null;

  skills: string[];

  source: "facebook";
  source_url: string | null;
}

export interface ApiSuccess<T> {
  success: true;
  status: number;
  message: string;
  data: T;
  timestamp: string;
}
