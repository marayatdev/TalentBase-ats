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

import type {
  ExtensionJob,
} from "../../types/job";

console.log(
  "[HR ATS Extension] Facebook content script loaded",
);

const ARTICLE_SELECTOR =
  '[role="article"]';

const SCAN_DELAY_MS =
  700;

const MAX_AI_ANALYSIS_PER_SCAN =
  1;

const MIN_LOCAL_SCORE_FOR_AI =
  -100;

const MIN_AI_CONFIDENCE =
  70;

/*
 * null = Any time
 *
 * 1  = Last 1 day
 * 3  = Last 3 days
 * 7  = Last 7 days
 * 14 = Last 14 days
 * 30 = Last 30 days
 */
let postMaxAgeDays:
  | number
  | null = null;

let selectedJob:
  | ExtensionJob
  | null = null;

let scanTimer:
  | number
  | undefined;

let lastSignature =
  "";

const articleByPostId =
  new Map<
    string,
    HTMLElement
  >();

/*
 * ป้องกันการส่งโพสต์เดิมไปวิเคราะห์ซ้ำ
 */
const analyzingPostIds =
  new Set<string>();

const analyzedPostIds =
  new Set<string>();

/*
 * เก็บผล AI ไว้สำหรับกรณี Facebook rerender DOM
 */
const analysisCache =
  new Map<
    string,
    CandidatePostAnalysis
  >();

interface AnalyzePostMessageResponse {
  success: boolean;
  data?: CandidatePostAnalysis;
  message?: string;
}

interface SelectedJobChangedMessage {
  type:
  "SELECTED_JOB_CHANGED";

  payload?: {
    job?:
    | ExtensionJob
    | null;
  };
}

interface PostAgeFilterChangedMessage {
  type:
  "POST_AGE_FILTER_CHANGED";

  payload?: {
    maxAgeDays?:
    | number
    | null;
  };
}

type ContentMessage =
  | SelectedJobChangedMessage
  | PostAgeFilterChangedMessage;

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
        [
          post.id,
          post.score,
          post.isMatched,
          post.createdAtDate ?? "unknown-date",
        ].join(":"),
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
    posts.map(
      (
        post,
        index,
      ) => ({
        post:
          index + 1,

        author:
          post.author ?? "-",

        createdAt:
          post.createdAt ?? "-",

        createdAtDate:
          post.createdAtDate ?? "-",

        localScore:
          post.score,

        localMatched:
          post.isMatched,

        keywords:
          post.matchedKeywords.join(
            ", ",
          ),

        hasUrl:
          Boolean(
            post.url,
          ),

        preview:
          post.text.slice(
            0,
            100,
          ),
      }),
    ),
  );
}

function printAIAnalysis(
  post: FacebookPostMatch,
  analysis: CandidatePostAnalysis,
): void {
  const passed =
    isAcceptedAnalysis(
      analysis,
    );

  console.groupCollapsed(
    `[HR ATS Extension] AI analysis · ${passed
      ? "MATCH"
      : "NOT MATCH"
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
    "Created at:",
    post.createdAt,
  );

  console.log(
    "Created at date:",
    post.createdAtDate,
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
      id:
        selectedJob?.id,

      title:
        selectedJob?.title,
    },
  );

  console.log(
    "Post max age days:",
    postMaxAgeDays ??
    "Any time",
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

  lastSignature =
    "";
}

function normalizePostMaxAgeDays(
  value: unknown,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(
      parsed,
    ) ||
    parsed <= 0
  ) {
    return null;
  }

  const allowedDays =
    new Set([
      1,
      3,
      7,
      14,
      30,
    ]);

  return allowedDays.has(
    parsed,
  )
    ? parsed
    : null;
}

function isPostWithinAge(
  post: FacebookPost,
): boolean {
  /*
   * Any time
   */
  if (
    postMaxAgeDays ===
    null
  ) {
    return true;
  }

  /*
   * ถ้า HR เลือก filter เวลา
   * แต่ parser อ่านวันที่โพสต์ไม่ได้
   * จะไม่ส่งโพสต์นี้เข้า AI
   *
   * เพื่อป้องกันโพสต์เก่าที่ไม่ทราบเวลา
   * หลุดเข้ามาในผลลัพธ์
   */
  if (
    !post.createdAtDate
  ) {
    return false;
  }

  const createdAt =
    new Date(
      post.createdAtDate,
    );

  if (
    Number.isNaN(
      createdAt.getTime(),
    )
  ) {
    return false;
  }

  const ageMilliseconds =
    Date.now() -
    createdAt.getTime();

  /*
   * ป้องกันเวลาที่ parse แล้วเป็นอนาคต
   */
  if (
    ageMilliseconds <
    0
  ) {
    return false;
  }

  const maximumAgeMilliseconds =
    postMaxAgeDays *
    24 *
    60 *
    60 *
    1000;

  return (
    ageMilliseconds <=
    maximumAgeMilliseconds
  );
}

async function loadSettings(): Promise<void> {
  const stored =
    await chrome.storage.local.get([
      "selectedJob",
      "postMaxAgeDays",
    ]);

  selectedJob =
    (
      stored.selectedJob as
      | ExtensionJob
      | undefined
    ) ?? null;

  postMaxAgeDays =
    normalizePostMaxAgeDays(
      stored.postMaxAgeDays,
    );

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
  } else {
    console.warn(
      "[HR ATS Extension] No job selected. Open the extension popup and select a job.",
    );
  }

  console.log(
    "[HR ATS Extension] Post age filter loaded",
    {
      maxAgeDays:
        postMaxAgeDays,

      label:
        postMaxAgeDays ===
          null
          ? "Any time"
          : `Last ${postMaxAgeDays} day(s)`,
    },
  );
}

function isExtensionContextAvailable(): boolean {
  try {
    return Boolean(
      chrome.runtime?.id,
    );
  } catch {
    return false;
  }
}

function showExtensionReloadNotice(): void {
  const noticeId =
    "hr-ats-extension-reload-notice";

  if (
    document.getElementById(
      noticeId,
    )
  ) {
    return;
  }

  const notice =
    document.createElement(
      "div",
    );

  notice.id =
    noticeId;

  notice.textContent =
    "HR ATS Extension was updated. Refresh this Facebook page to continue.";

  Object.assign(
    notice.style,
    {
      position:
        "fixed",

      right:
        "20px",

      bottom:
        "20px",

      zIndex:
        "2147483647",

      maxWidth:
        "360px",

      padding:
        "12px 16px",

      borderRadius:
        "10px",

      background:
        "#1F4A3A",

      color:
        "#FFFFFF",

      fontSize:
        "13px",

      fontFamily:
        "Arial, sans-serif",

      lineHeight:
        "1.5",

      boxShadow:
        "0 10px 30px rgba(0,0,0,0.18)",
    },
  );

  document.body.appendChild(
    notice,
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
    !isPostWithinAge(
      post,
    )
  ) {
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

  if (
    !isExtensionContextAvailable()
  ) {
    console.warn(
      "[HR ATS Extension] Extension context was invalidated. Refresh the Facebook page.",
    );

    showExtensionReloadNotice();

    return;
  }

  analyzingPostIds.add(
    post.id,
  );

  /*
   * เก็บ Job snapshot ไว้
   * ป้องกัน Job เปลี่ยนระหว่างรอ AI
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

            createdAtDate:
              post.createdAtDate,
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

            status:
              jobSnapshot.status,
          },
        },
      })) as AnalyzePostMessageResponse;

    /*
     * ถ้าผู้ใช้เปลี่ยน Job ระหว่างรอ AI
     * ไม่ใช้ผลของ Job เก่า
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

    /*
     * ถ้าผู้ใช้เปลี่ยน age filter
     * ระหว่างรอ AI และโพสต์นี้ไม่ผ่าน filter ใหม่แล้ว
     * ไม่แสดงผล
     */
    if (
      !isPostWithinAge(
        post,
      )
    ) {
      console.warn(
        "[HR ATS Extension] Ignoring stale AI result because post age filter changed",
        {
          postId:
            post.id,

          createdAt:
            post.createdAt,

          createdAtDate:
            post.createdAtDate,

          postMaxAgeDays,
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
     * แสดงหรือลบ UI ทันทีหลัง AI ตอบ
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

          createdAt:
            post.createdAt,

          createdAtDate:
            post.createdAtDate,
        },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(
          error,
        );

    if (
      message.includes(
        "Extension context invalidated",
      )
    ) {
      console.warn(
        "[HR ATS Extension] Extension was reloaded. Refresh the Facebook page before scanning again.",
      );

      showExtensionReloadNotice();

      return;
    }

    /*
     * ไม่เพิ่ม analyzedPostIds
     * เพื่อให้ scan รอบถัดไปลองใหม่ได้
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
    .filter(
      (
        post,
      ) => {
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
         * ต้องมี URL เพื่อ save source_url
         */
        if (!post.url) {
          return false;
        }

        /*
         * กรองอายุโพสต์ก่อนส่ง AI
         */
        if (
          !isPostWithinAge(
            post,
          )
        ) {
          return false;
        }

        /*
         * Local filter threshold
         */
        if (
          post.score <
          MIN_LOCAL_SCORE_FOR_AI
        ) {
          return false;
        }

        return true;
      },
    )
    .sort(
      (
        first,
        second,
      ) =>
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
  for (
    const post
    of posts
  ) {
    /*
     * ถ้า post ไม่ผ่าน age filter ปัจจุบัน
     * ต้องไม่ restore toolbar จาก cache
     */
    if (
      !isPostWithinAge(
        post,
      )
    ) {
      const article =
        articleByPostId.get(
          post.id,
        );

      if (
        article
      ) {
        removePostMatchUI(
          article,
        );
      }

      continue;
    }

    const analysis =
      analysisCache.get(
        post.id,
      );

    if (!analysis) {
      continue;
    }

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

  let skippedByAge =
    0;

  let skippedUnknownDate =
    0;

  const posts =
    articles
      .map(
        (
          article,
        ) => {
          const parsedPost =
            parsePost(
              article,
            );

          if (
            !parsedPost
          ) {
            return null;
          }

          /*
           * เก็บ map ก่อน filter
           * เพื่อให้ลบ UI เดิมได้แม้ post ถูก filter ออก
           */
          articleByPostId.set(
            parsedPost.id,
            article,
          );

          if (
            !isPostWithinAge(
              parsedPost,
            )
          ) {
            if (
              postMaxAgeDays !== null &&
              !parsedPost.createdAtDate
            ) {
              skippedUnknownDate += 1;

              /*
               * Facebook อาจ rerender แล้วทำให้
               * parser อ่านวันที่ไม่ได้ชั่วคราว
               *
               * ถ้ามี AI result เดิมอยู่แล้ว
               * อย่าเพิ่งลบ toolbar
               */
              const cachedAnalysis =
                analysisCache.get(
                  parsedPost.id,
                );

              if (
                cachedAnalysis &&
                isAcceptedAnalysis(
                  cachedAnalysis,
                )
              ) {
                updatePostUI(
                  filterFacebookPost(
                    parsedPost,
                    defaultFilterConfig,
                  ),
                  cachedAnalysis,
                );
              }

              return null;
            }

            skippedByAge += 1;

            /*
             * กรณีรู้วันที่จริงและเกินช่วงที่ HR เลือก
             * ลบได้
             */
            removePostMatchUI(
              article,
            );

            return null;
          }

          return filterFacebookPost(
            parsedPost,
            defaultFilterConfig,
          );
        },
      )
      .filter(
        (
          post,
        ): post is FacebookPostMatch =>
          post !== null,
      );

  if (
    postMaxAgeDays !==
    null
  ) {
    console.log(
      "[HR ATS Extension] Post age filter result",
      {
        maxAgeDays:
          postMaxAgeDays,

        accepted:
          posts.length,

        skippedByAge,

        skippedUnknownDate,
      },
    );
  }

  /*
   * Facebook อาจสร้าง DOM ใหม่ตอน scroll
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
        (
          post,
        ) =>
          post.isMatched,
      );

    console.log(
      `[HR ATS Extension] Local filter matched ${localMatches.length} posts for ${selectedJob.title}`,
    );

    console.log(
      "[HR ATS Extension] Active post age filter",
      postMaxAgeDays ===
        null
        ? "Any time"
        : `Last ${postMaxAgeDays} day(s)`,
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

function handleSelectedJobChanged(
  job:
    | ExtensionJob
    | null,
): void {
  selectedJob =
    job;

  /*
   * Job เปลี่ยนแล้วผล AI เดิมใช้ไม่ได้
   */
  clearAnalysisState();
  clearPostUI();

  console.log(
    "[HR ATS Extension] Selected job changed",
    selectedJob,
  );

  if (
    selectedJob
  ) {
    scheduleScan();
  }
}

function handlePostAgeFilterChanged(
  maxAgeDays:
    | number
    | null,
): void {
  postMaxAgeDays =
    normalizePostMaxAgeDays(
      maxAgeDays,
    );

  /*
   * ต้องล้าง cache เพราะผลเดิมอาจเป็นโพสต์
   * ที่ไม่ผ่าน filter ใหม่
   */
  clearAnalysisState();
  clearPostUI();

  console.log(
    "[HR ATS Extension] Post age filter changed",
    {
      maxAgeDays:
        postMaxAgeDays,

      label:
        postMaxAgeDays ===
          null
          ? "Any time"
          : `Last ${postMaxAgeDays} day(s)`,
    },
  );

  if (
    selectedJob
  ) {
    scheduleScan();
  }
}

/*
 * รับ event จาก Popup โดยตรง
 */
chrome.runtime.onMessage.addListener(
  (
    message:
      ContentMessage,
  ) => {
    if (
      message.type ===
      "SELECTED_JOB_CHANGED"
    ) {
      handleSelectedJobChanged(
        message.payload?.job ??
        null,
      );

      return false;
    }

    if (
      message.type ===
      "POST_AGE_FILTER_CHANGED"
    ) {
      handlePostAgeFilterChanged(
        message.payload
          ?.maxAgeDays ??
        null,
      );

      return false;
    }

    return false;
  },
);

/*
 * รับ storage change เป็น fallback
 *
 * ทำให้แม้ Popup ส่ง message ไม่ถึง
 * content script ก็ยังเห็นค่าที่เปลี่ยน
 */
chrome.storage.onChanged.addListener(
  (
    changes,
    areaName,
  ) => {
    if (
      areaName !==
      "local"
    ) {
      return;
    }

    if (
      changes.selectedJob
    ) {
      const newJob =
        (
          changes.selectedJob
            .newValue as
          | ExtensionJob
          | undefined
        ) ?? null;

      handleSelectedJobChanged(
        newJob,
      );
    }

    if (
      changes.postMaxAgeDays
    ) {
      handlePostAgeFilterChanged(
        normalizePostMaxAgeDays(
          changes.postMaxAgeDays
            .newValue,
        ),
      );
    }
  },
);

async function startScanner(): Promise<void> {
  await loadSettings();

  if (
    selectedJob
  ) {
    scanFacebookPosts();
  }

  const observer =
    new MutationObserver(
      () => {
        if (
          selectedJob
        ) {
          scheduleScan();
        }
      },
    );

  observer.observe(
    document.body,
    {
      childList:
        true,

      subtree:
        true,
    },
  );

  console.log(
    "[HR ATS Extension] Facebook observer started",
    {
      selectedJobId:
        selectedJob?.id ??
        null,

      postMaxAgeDays,
    },
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
      once:
        true,
    },
  );
} else {
  void startScanner();
}