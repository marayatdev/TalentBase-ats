import { parsePost } from "./parser";
import {
  defaultFilterConfig,
  filterFacebookPost,
} from "./filter";
import {
  removePostMatchUI,
  renderPostMatchUI,
} from "./post-ui";

import type {
  CandidatePostAnalysis,
  FacebookPost,
  FacebookPostMatch,
} from "../../types/facebook-post";
import type { ExtensionJob } from "../../types/job";

console.log(
  "[HR ATS Extension] Facebook content script loaded",
);

const ARTICLE_SELECTOR = '[role="article"]';
const SCAN_DELAY_MS = 700;

const MAX_AI_ANALYSIS_PER_SCAN = 1;
const MIN_LOCAL_SCORE_FOR_AI = -100;
const MIN_AI_CONFIDENCE = 70;

let selectedJob: ExtensionJob | null = null;
let scanTimer: number | undefined;
let lastSignature = "";

const articleByPostId =
  new Map<string, HTMLElement>();

/*
 * ป้องกันการส่งโพสต์เดิมไปวิเคราะห์ซ้ำ
 */
const analyzingPostIds =
  new Set<string>();

const analyzedPostIds =
  new Set<string>();

/*
 * เก็บผล AI เอาไว้ใช้ตอน Facebook rerender DOM
 */
const analysisCache =
  new Map<string, CandidatePostAnalysis>();

interface AnalyzePostMessageResponse {
  success: boolean;
  data?: CandidatePostAnalysis;
  message?: string;
}

interface SelectedJobChangedMessage {
  type: "SELECTED_JOB_CHANGED";

  payload?: {
    job?: ExtensionJob | null;
  };
}

function findArticles(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      ARTICLE_SELECTOR,
    ),
  );
}

function createPostsSignature(
  posts: FacebookPostMatch[],
): string {
  return posts
    .map(
      (post) =>
        `${post.id}:${post.score}:${post.isMatched}`,
    )
    .join("|");
}

function isAcceptedAnalysis(
  analysis: CandidatePostAnalysis,
): boolean {
  return (
    analysis.is_job_seeker &&
    analysis.matches_target_position &&
    analysis.confidence >=
    MIN_AI_CONFIDENCE
  );
}

function printPosts(
  posts: FacebookPostMatch[],
): void {
  console.log(
    `[HR ATS Extension] Parsed ${posts.length} Facebook posts`,
  );

  console.table(
    posts.map((post, index) => ({
      post: index + 1,
      author: post.author ?? "-",
      createdAt: post.createdAt ?? "-",
      localScore: post.score,
      localMatched: post.isMatched,
      keywords:
        post.matchedKeywords.join(", "),
      hasUrl: Boolean(post.url),
      preview:
        post.text.slice(0, 100),
    })),
  );
}

function printAIAnalysis(
  post: FacebookPostMatch,
  analysis: CandidatePostAnalysis,
): void {
  const passed =
    isAcceptedAnalysis(analysis);

  console.groupCollapsed(
    `[HR ATS Extension] AI analysis · ${passed ? "MATCH" : "NOT MATCH"
    } · ${analysis.confidence}%`,
  );

  console.log(
    "Author:",
    post.author,
  );

  console.log(
    "Post URL:",
    post.url,
  );

  console.log(
    "Detected position:",
    analysis.detected_position,
  );

  console.log(
    "Target position:",
    analysis.target_position,
  );

  console.log(
    "Selected job:",
    {
      id: selectedJob?.id,
      title: selectedJob?.title,
    },
  );

  console.log(
    "Is job seeker:",
    analysis.is_job_seeker,
  );

  console.log(
    "Matches target:",
    analysis.matches_target_position,
  );

  console.log(
    "Confidence:",
    analysis.confidence,
  );

  console.log(
    "Reason:",
    analysis.reason,
  );

  console.log(
    "Skills:",
    analysis.skills,
  );

  console.log(
    "Candidate:",
    {
      full_name:
        analysis.full_name,

      email:
        analysis.email,

      phone:
        analysis.phone,
    },
  );

  console.log(
    "Post text:",
    post.text,
  );

  console.groupEnd();
}

function updatePostUI(
  post: FacebookPostMatch,
  analysis: CandidatePostAnalysis,
): void {
  const article =
    articleByPostId.get(
      post.id,
    );

  if (
    !article ||
    !article.isConnected
  ) {
    return;
  }

  if (
    isAcceptedAnalysis(
      analysis,
    )
  ) {
    renderPostMatchUI(
      article,
      post,
      analysis,
    );

    return;
  }

  removePostMatchUI(
    article,
  );
}

function clearPostUI(): void {
  for (
    const article
    of articleByPostId.values()
  ) {
    if (
      article.isConnected
    ) {
      removePostMatchUI(
        article,
      );
    }
  }
}

function clearAnalysisState(): void {
  analyzingPostIds.clear();
  analyzedPostIds.clear();
  analysisCache.clear();

  lastSignature = "";
}

async function loadSelectedJob(): Promise<void> {
  const stored =
    await chrome.storage.local.get(
      "selectedJob",
    );

  selectedJob =
    (
      stored.selectedJob as
      | ExtensionJob
      | undefined
    ) ?? null;

  if (selectedJob) {
    console.log(
      "[HR ATS Extension] Selected job loaded",
      {
        id:
          selectedJob.id,

        title:
          selectedJob.title,
      },
    );

    return;
  }

  console.warn(
    "[HR ATS Extension] No job selected. Open the extension popup and select a job.",
  );
}

async function analyzePostWithAI(
  post: FacebookPostMatch,
): Promise<void> {
  if (!selectedJob) {
    console.warn(
      "[HR ATS Extension] Skipping AI analysis because no job is selected",
    );

    return;
  }

  if (
    analyzedPostIds.has(
      post.id,
    ) ||
    analyzingPostIds.has(
      post.id,
    )
  ) {
    return;
  }

  analyzingPostIds.add(
    post.id,
  );

  /*
   * เก็บ snapshot ป้องกัน Job เปลี่ยน
   * ระหว่างที่กำลังรอ AI ตอบกลับ
   */
  const jobSnapshot =
    selectedJob;

  try {
    const response =
      (await chrome.runtime.sendMessage({
        type:
          "ANALYZE_FACEBOOK_POST",

        payload: {
          post: {
            id:
              post.id,

            author:
              post.author,

            text:
              post.text,

            url:
              post.url,

            createdAt:
              post.createdAt,
          } satisfies FacebookPost,

          job: {
            id:
              jobSnapshot.id,

            title:
              jobSnapshot.title,

            description:
              jobSnapshot.description,

            requirements:
              jobSnapshot.requirements,

            minimum_experience_years:
              jobSnapshot.minimum_experience_years,

            employment_type:
              jobSnapshot.employment_type,
          },
        },
      })) as AnalyzePostMessageResponse;

    /*
     * หากผู้ใช้เปลี่ยน Job ระหว่างรอ AI
     * ไม่ควรเอาผลเก่ามาแสดง
     */
    if (
      selectedJob?.id !==
      jobSnapshot.id
    ) {
      console.warn(
        "[HR ATS Extension] Ignoring stale AI result because selected job changed",
        {
          analyzedJobId:
            jobSnapshot.id,

          currentJobId:
            selectedJob?.id,
        },
      );

      return;
    }

    if (
      !response?.success ||
      !response.data
    ) {
      throw new Error(
        response?.message ??
        "AI post analysis failed",
      );
    }

    const analysis =
      response.data;

    analysisCache.set(
      post.id,
      analysis,
    );

    analyzedPostIds.add(
      post.id,
    );

    printAIAnalysis(
      post,
      analysis,
    );

    /*
     * แสดงหรือลบ UI ทันทีหลัง AI ตอบกลับ
     */
    updatePostUI(
      post,
      analysis,
    );

    if (
      isAcceptedAnalysis(
        analysis,
      )
    ) {
      console.log(
        "[HR ATS Extension] Candidate post accepted",
        {
          postId:
            post.id,

          author:
            post.author,

          url:
            post.url,

          confidence:
            analysis.confidence,

          jobId:
            jobSnapshot.id,

          jobTitle:
            jobSnapshot.title,
        },
      );
    }
  } catch (error) {
    /*
     * ไม่เพิ่มลง analyzedPostIds
     * เพื่อให้ลองใหม่ใน scan รอบถัดไปได้
     */
    console.error(
      "[HR ATS Extension] AI analysis failed",
      {
        postId:
          post.id,

        jobId:
          jobSnapshot.id,

        error,
      },
    );
  } finally {
    analyzingPostIds.delete(
      post.id,
    );
  }
}

function selectPostsForAI(
  posts: FacebookPostMatch[],
): FacebookPostMatch[] {
  if (!selectedJob) {
    return [];
  }

  return posts
    .filter((post) => {
      if (
        analyzedPostIds.has(
          post.id,
        ) ||
        analyzingPostIds.has(
          post.id,
        )
      ) {
        return false;
      }

      /*
       * ไม่ส่งโพสต์ที่คะแนน Local ต่ำเกินไป
       */
      if (
        post.score <
        MIN_LOCAL_SCORE_FOR_AI
      ) {
        return false;
      }

      return true;
    })
    .sort(
      (first, second) =>
        second.score -
        first.score,
    )
    .slice(
      0,
      MAX_AI_ANALYSIS_PER_SCAN,
    );
}

function restoreCachedPostUI(
  posts: FacebookPostMatch[],
): void {
  for (const post of posts) {
    const analysis =
      analysisCache.get(
        post.id,
      );

    if (!analysis) {
      continue;
    }

    /*
     * Facebook อาจสร้าง article DOM ใหม่ตอน scroll
     * จึงต้อง render toolbar กลับมาอีกครั้งจาก cache
     */
    updatePostUI(
      post,
      analysis,
    );
  }
}

function scanFacebookPosts(): FacebookPostMatch[] {
  if (!selectedJob) {
    console.warn(
      "[HR ATS Extension] Scan paused because no job is selected",
    );

    clearPostUI();

    return [];
  }

  const articles =
    findArticles();

  console.log(
    `[HR ATS Extension] Found ${articles.length} article elements`,
  );

  const posts =
    articles
      .map((article) => {
        const parsedPost =
          parsePost(
            article,
          );

        if (!parsedPost) {
          return null;
        }

        articleByPostId.set(
          parsedPost.id,
          article,
        );

        return filterFacebookPost(
          parsedPost,
          defaultFilterConfig,
        );
      })
      .filter(
        (
          post,
        ): post is FacebookPostMatch =>
          post !== null,
      );

  /*
   * คืน toolbar จาก cache หาก Facebook rerender โพสต์
   */
  restoreCachedPostUI(
    posts,
  );

  const signature =
    createPostsSignature(
      posts,
    );

  if (
    signature !==
    lastSignature
  ) {
    lastSignature =
      signature;

    printPosts(
      posts,
    );

    const localMatches =
      posts.filter(
        (post) =>
          post.isMatched,
      );

    console.log(
      `[HR ATS Extension] Local filter matched ${localMatches.length} posts for ${selectedJob.title}`,
    );
  }

  const postsForAI =
    selectPostsForAI(
      posts,
    );

  if (
    postsForAI.length >
    0
  ) {
    console.log(
      `[HR ATS Extension] Sending ${postsForAI.length} posts to AI for ${selectedJob.title}`,
    );

    for (
      const post
      of postsForAI
    ) {
      void analyzePostWithAI(
        post,
      );
    }
  }

  return posts;
}

function scheduleScan(): void {
  window.clearTimeout(
    scanTimer,
  );

  scanTimer =
    window.setTimeout(
      () => {
        scanFacebookPosts();
      },
      SCAN_DELAY_MS,
    );
}

chrome.runtime.onMessage.addListener(
  (
    message:
      SelectedJobChangedMessage,
  ) => {
    if (
      message.type !==
      "SELECTED_JOB_CHANGED"
    ) {
      return false;
    }

    selectedJob =
      message.payload?.job ??
      null;

    /*
     * Job เปลี่ยนแล้ว ต้องล้าง cache
     * เพราะโพสต์เดิมต้องวิเคราะห์ใหม่
     * ด้วย criteria ของ Job ใหม่
     */
    clearAnalysisState();
    clearPostUI();

    console.log(
      "[HR ATS Extension] Selected job changed",
      selectedJob,
    );

    if (selectedJob) {
      scheduleScan();
    }

    return false;
  },
);

chrome.storage.onChanged.addListener(
  (
    changes,
    areaName,
  ) => {
    if (
      areaName !== "local" ||
      !changes.selectedJob
    ) {
      return;
    }

    selectedJob =
      (
        changes.selectedJob
          .newValue as
        | ExtensionJob
        | undefined
      ) ?? null;

    clearAnalysisState();
    clearPostUI();

    console.log(
      "[HR ATS Extension] Selected job changed from storage",
      selectedJob,
    );

    if (selectedJob) {
      scheduleScan();
    }
  },
);

async function startScanner(): Promise<void> {
  await loadSelectedJob();

  if (selectedJob) {
    scanFacebookPosts();
  }

  const observer =
    new MutationObserver(
      () => {
        if (selectedJob) {
          scheduleScan();
        }
      },
    );

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true,
    },
  );

  console.log(
    "[HR ATS Extension] Facebook observer started",
  );
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      void startScanner();
    },
    {
      once: true,
    },
  );
} else {
  void startScanner();
}