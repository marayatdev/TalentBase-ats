import type { ExtensionJob } from "../types/job";

import type { ExtensionMessage } from "../types/messages";

import type {
  CandidatePostAnalysis,
} from "../types/facebook-post";

import type {
  CandidateLead,
  CreateCandidateLeadPayload,
} from "../types/candidate-lead";

/*
 * =========================================================
 * CONFIG
 * =========================================================
 */

const ATS_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "https://talentbase-ats-production.up.railway.app/api";

/*
 * =========================================================
 * API TYPES
 * =========================================================
 */

interface ApiSuccess<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
}

interface ApiErrorResponse {
  success?: boolean;
  status?: number;
  message?: string;
}


interface SearchQueriesResult {
  job_id: string;
  job_title: string;
  queries: string[];
}

interface ExtensionResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface ExtensionUser {
  id: string;
  name: string | null;
  email: string;
  role?: string;
}

interface ExtensionLoginResult {
  accessToken: string;
  user: ExtensionUser;
}

interface AuthSession {
  isAuthenticated: boolean;
  user: ExtensionUser | null;
}

interface ExtensionLoginPayload {
  email: string;
  password: string;
}

/*
 * =========================================================
 * JOB TYPES
 * =========================================================
 */

interface JobsResponse {
  jobs: Array<{
    id: string | number;

    title: string;

    description?: string | null;

    requirements?: string | null;

    minimum_experience_years?:
    | string
    | number
    | null;

    employment_type:
    | "full_time"
    | "part_time"
    | "contract"
    | "internship";

    status:
    | "draft"
    | "open"
    | "closed";
  }>;
}

/*
 * =========================================================
 * SEARCH QUERY TYPES
 * =========================================================
 */

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function normalizeJob(
  job: JobsResponse["jobs"][number],
): ExtensionJob {
  return {
    id: String(job.id),

    title: job.title,

    description:
      job.description ?? null,

    requirements:
      job.requirements ?? null,

    minimum_experience_years:
      Number(
        job.minimum_experience_years ??
        0,
      ),

    employment_type:
      job.employment_type,

    status:
      job.status,
  };
}

async function parseErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const body =
      (await response.json()) as ApiErrorResponse;

    return (
      body.message ??
      fallbackMessage
    );
  } catch {
    return fallbackMessage;
  }
}

/*
 * =========================================================
 * EXTENSION AUTH
 * =========================================================
 */

const ACCESS_TOKEN_STORAGE_KEY = "extensionAccessToken";
const AUTH_USER_STORAGE_KEY = "extensionAuthUser";

async function getAccessToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get(
    ACCESS_TOKEN_STORAGE_KEY,
  );

  const value =
    stored[ACCESS_TOKEN_STORAGE_KEY];

  return typeof value === "string" &&
    value.trim().length > 0
    ? value
    : null;
}

async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken =
    await getAccessToken();

  if (!accessToken) {
    throw new Error(
      "No access token found. Please login again.",
    );
  }

  const headers =
    new Headers(
      options.headers,
    );

  headers.set(
    "Accept",
    "application/json",
  );

  headers.set(
    "Authorization",
    `Bearer ${accessToken}`,
  );

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  const response =
    await fetch(
      `${ATS_API_BASE_URL}${path}`,
      {
        ...options,
        headers,
      },
    );

  if (
    response.status ===
    401
  ) {
    await chrome.storage.local.remove([
      ACCESS_TOKEN_STORAGE_KEY,
      AUTH_USER_STORAGE_KEY,
      "selectedJob",
    ]);
  }

  return response;
}

async function extensionLogin(
  payload: ExtensionLoginPayload,
): Promise<ExtensionUser> {
  const email =
    payload.email?.trim();

  const password =
    payload.password ?? "";

  if (
    !email ||
    !password
  ) {
    throw new Error(
      "Email and password are required",
    );
  }

  const response =
    await fetch(
      `${ATS_API_BASE_URL}/auth/extension-login`,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            email,
            password,
          }),
      },
    );

  if (
    !response.ok
  ) {
    const message =
      await parseErrorMessage(
        response,
        `Could not login (${response.status})`,
      );

    throw new Error(
      message,
    );
  }

  const body =
    (await response.json()) as
    ApiSuccess<ExtensionLoginResult>;

  if (
    !body.data?.accessToken ||
    !body.data?.user
  ) {
    throw new Error(
      "Login response did not contain access token",
    );
  }

  await chrome.storage.local.set({
    [ACCESS_TOKEN_STORAGE_KEY]:
      body.data.accessToken,

    [AUTH_USER_STORAGE_KEY]:
      body.data.user,
  });

  return body.data.user;
}

async function getAuthSession(): Promise<AuthSession> {
  const stored =
    await chrome.storage.local.get([
      ACCESS_TOKEN_STORAGE_KEY,
      AUTH_USER_STORAGE_KEY,
    ]);

  const accessToken =
    stored[
    ACCESS_TOKEN_STORAGE_KEY
    ];

  const user =
    (stored[
      AUTH_USER_STORAGE_KEY
    ] as
      | ExtensionUser
      | undefined) ??
    null;

  return {
    isAuthenticated:
      typeof accessToken ===
      "string" &&
      accessToken.trim()
        .length >
      0 &&
      user !== null,

    user,
  };
}

async function extensionLogout(): Promise<void> {
  await chrome.storage.local.remove([
    ACCESS_TOKEN_STORAGE_KEY,
    AUTH_USER_STORAGE_KEY,
    "selectedJob",
  ]);

  try {
    await fetch(
      `${ATS_API_BASE_URL}/auth/logout`,
      {
        method:
          "POST",

        credentials:
          "include",

        headers: {
          Accept:
            "application/json",
        },
      },
    );
  } catch (
  error
  ) {
    console.warn(
      "[HR ATS Extension] Backend logout request failed",
      error,
    );
  }
}

/*
 * =========================================================
 * JOB API
 * =========================================================
 */

/*
 * โหลด Job ที่ status = open
 */
async function getOpenJobs(): Promise<
  ExtensionJob[]
> {
  const response =
    await authenticatedFetch(
      "/jobs?page=1&page_size=100&status=open",
      {
        method: "GET",
      },
    );

  if (!response.ok) {
    const message =
      await parseErrorMessage(
        response,
        `Could not load jobs (${response.status})`,
      );

    throw new Error(message);
  }

  const body =
    (await response.json()) as
    ApiSuccess<JobsResponse>;

  return (
    body.data?.jobs ??
    []
  ).map(normalizeJob);
}

/*
 * =========================================================
 * SELECTED JOB STORAGE
 * =========================================================
 */

async function getSelectedJob(): Promise<
  ExtensionJob | null
> {
  const stored =
    await chrome.storage.local.get(
      "selectedJob",
    );

  return (
    stored.selectedJob as
    | ExtensionJob
    | undefined
  ) ?? null;
}

async function setSelectedJob(
  job: ExtensionJob | null,
): Promise<void> {
  if (job) {
    await chrome.storage.local.set({
      selectedJob: job,
    });

    return;
  }

  await chrome.storage.local.remove(
    "selectedJob",
  );
}

/*
 * =========================================================
 * FACEBOOK AI ANALYSIS
 * =========================================================
 */

async function analyzeFacebookPost(
  message: Extract<
    ExtensionMessage,
    {
      type:
      "ANALYZE_FACEBOOK_POST";
    }
  >,
): Promise<CandidatePostAnalysis> {
  const {
    post,
    job,
  } = message.payload;

  if (!job?.id) {
    throw new Error(
      "No job was selected",
    );
  }

  if (!post?.text?.trim()) {
    throw new Error(
      "Facebook post text is empty",
    );
  }

  console.log(
    "[HR ATS Extension] Analyzing Facebook post",
    {
      postId:
        post.id,

      jobId:
        job.id,

      jobTitle:
        job.title,
    },
  );

  const response =
    await authenticatedFetch(
      "/candidate-imports/analyze-post",
      {
        method: "POST",
        body: JSON.stringify({
          source:
            "facebook",

          source_url:
            post.url ??
            null,

          raw_text:
            post.text,

          /*
           * Backend ใช้ Job ID
           * เพื่อดึง JD จาก Database
           */
          job_id:
            job.id,

          /*
           * ส่งไว้เผื่อ Backend
           * version เก่ายังใช้อยู่
           */
          target_position:
            job.title,
        }),
      },
    );

  if (!response.ok) {
    const errorMessage =
      await parseErrorMessage(
        response,
        `Could not analyze Facebook post (${response.status})`,
      );

    throw new Error(
      errorMessage,
    );
  }

  const body =
    (await response.json()) as
    ApiSuccess<CandidatePostAnalysis>;

  if (!body.data) {
    throw new Error(
      "AI analysis result was not returned",
    );
  }

  return body.data;
}

/*
 * =========================================================
 * SAVE CANDIDATE LEAD
 * =========================================================
 */

async function createCandidateLead(
  payload: CreateCandidateLeadPayload,
): Promise<CandidateLead> {
  console.log(
    "[HR ATS Extension] Sending candidate lead to ATS",
    payload,
  );

  const response =
    await authenticatedFetch(
      "/candidate-leads",
      {
        method: "POST",
        body: JSON.stringify(
          payload,
        ),
      },
    );

  let body:
    | ApiSuccess<CandidateLead>
    | ApiErrorResponse;

  try {
    body =
      (await response.json()) as
      | ApiSuccess<CandidateLead>
      | ApiErrorResponse;
  } catch {
    throw new Error(
      `Could not save candidate lead (${response.status})`,
    );
  }

  console.log(
    "[HR ATS Extension] Candidate lead API response",
    {
      status:
        response.status,

      body,
    },
  );

  if (
    !response.ok ||
    body.success !== true
  ) {
    throw new Error(
      body.message ??
      `Could not save candidate lead (${response.status})`,
    );
  }

  if (
    !("data" in body) ||
    !body.data
  ) {
    throw new Error(
      "Candidate lead response did not contain data",
    );
  }

  return body.data;
}

/*
 * =========================================================
 * GENERATE SEARCH QUERIES
 * =========================================================
 */

async function generateSearchQueries(
  jobId: string,
): Promise<SearchQueriesResult> {
  if (!jobId?.trim()) {
    throw new Error(
      "Job ID is required",
    );
  }

  console.log(
    "[HR ATS Extension] Generating search queries",
    {
      jobId,
    },
  );

  const response =
    await authenticatedFetch(
      `/jobs/${encodeURIComponent(
        jobId,
      )}/search-queries`,
      {
        method: "POST",
      },
    );

  if (!response.ok) {
    const message =
      await parseErrorMessage(
        response,
        `Could not generate search queries (${response.status})`,
      );

    throw new Error(
      message,
    );
  }

  const body =
    (await response.json()) as
    ApiSuccess<SearchQueriesResult>;

  if (!body.data) {
    throw new Error(
      "Search query result was not returned",
    );
  }

  if (
    !Array.isArray(
      body.data.queries,
    )
  ) {
    throw new Error(
      "Invalid search query response",
    );
  }

  console.log(
    "[HR ATS Extension] Search queries generated",
    {
      jobId:
        body.data.job_id,

      jobTitle:
        body.data.job_title,

      queries:
        body.data.queries,
    },
  );

  return body.data;
}

/*
 * =========================================================
 * MESSAGE LISTENER
 * =========================================================
 */

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender,
    sendResponse,
  ) => {
    /*
     * -----------------------------------------------------
     * EXTENSION LOGIN
     * -----------------------------------------------------
     */
    if (message.type === "EXTENSION_LOGIN") {
      const authMessage = message as ExtensionMessage & {
        payload: ExtensionLoginPayload;
      };

      void extensionLogin(authMessage.payload)
        .then((user) => {
          sendResponse({
            success: true,
            data: user,
          });
        })
        .catch((error: unknown) => {
          console.error(
            "[HR ATS Extension] Login failed",
            error,
          );

          sendResponse({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Could not login",
          });
        });

      return true;
    }

    /*
     * -----------------------------------------------------
     * GET AUTH SESSION
     * -----------------------------------------------------
     */
    if (message.type === "GET_AUTH_SESSION") {
      void getAuthSession()
        .then((session) => {
          sendResponse({
            success: true,
            data: session,
          });
        })
        .catch((error: unknown) => {
          console.error(
            "[HR ATS Extension] Could not load auth session",
            error,
          );

          sendResponse({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Could not load auth session",
          });
        });

      return true;
    }

    /*
     * -----------------------------------------------------
     * EXTENSION LOGOUT
     * -----------------------------------------------------
     */
    if (message.type === "EXTENSION_LOGOUT") {
      void extensionLogout()
        .then(() => {
          sendResponse({
            success: true,
            data: null,
          });
        })
        .catch((error: unknown) => {
          console.error(
            "[HR ATS Extension] Logout failed",
            error,
          );

          sendResponse({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Could not logout",
          });
        });

      return true;
    }

    /*
     * -----------------------------------------------------
     * GET OPEN JOBS
     * -----------------------------------------------------
     */

    if (
      message.type ===
      "GET_OPEN_JOBS"
    ) {
      void getOpenJobs()
        .then(
          (jobs) => {
            const response: ExtensionResponse<
              ExtensionJob[]
            > = {
              success:
                true,

              data:
                jobs,
            };

            sendResponse(
              response,
            );
          },
        )
        .catch(
          (
            error: unknown,
          ) => {
            console.error(
              "[HR ATS Extension] Could not load jobs",
              error,
            );

            sendResponse({
              success:
                false,

              message:
                error instanceof Error
                  ? error.message
                  : "Could not load open jobs",
            });
          },
        );

      /*
       * สำคัญ:
       * บอก Chrome ว่าจะตอบ async
       */
      return true;
    }

    /*
     * -----------------------------------------------------
     * GET SELECTED JOB
     * -----------------------------------------------------
     */

    if (
      message.type ===
      "GET_SELECTED_JOB"
    ) {
      void getSelectedJob()
        .then(
          (job) => {
            const response: ExtensionResponse<
              ExtensionJob | null
            > = {
              success:
                true,

              data:
                job,
            };

            sendResponse(
              response,
            );
          },
        )
        .catch(
          (
            error: unknown,
          ) => {
            console.error(
              "[HR ATS Extension] Could not load selected job",
              error,
            );

            sendResponse({
              success:
                false,

              message:
                error instanceof Error
                  ? error.message
                  : "Could not load selected job",
            });
          },
        );

      return true;
    }

    /*
     * -----------------------------------------------------
     * SET SELECTED JOB
     * -----------------------------------------------------
     */

    if (
      message.type ===
      "SET_SELECTED_JOB"
    ) {
      void setSelectedJob(
        message.payload.job,
      )
        .then(
          async () => {
            /*
             * แจ้ง Content Script
             * ว่า Job เปลี่ยนแล้ว
             */
            try {
              const tabs =
                await chrome.tabs.query({
                  url: [
                    "*://*.facebook.com/*",
                  ],
                });

              for (
                const tab
                of tabs
              ) {
                if (!tab.id) {
                  continue;
                }

                try {
                  await chrome.tabs.sendMessage(
                    tab.id,
                    {
                      type:
                        "SELECTED_JOB_CHANGED",

                      payload: {
                        job:
                          message.payload.job,
                      },
                    },
                  );
                } catch {
                  /*
                   * Tab อาจยังไม่มี content script
                   * ไม่ถือเป็น error
                   */
                }
              }
            } catch (
            error
            ) {
              console.warn(
                "[HR ATS Extension] Could not notify Facebook tabs",
                error,
              );
            }

            sendResponse({
              success:
                true,

              data:
                null,
            });
          },
        )
        .catch(
          (
            error: unknown,
          ) => {
            console.error(
              "[HR ATS Extension] Could not save selected job",
              error,
            );

            sendResponse({
              success:
                false,

              message:
                error instanceof Error
                  ? error.message
                  : "Could not save selected job",
            });
          },
        );

      return true;
    }

    /*
     * -----------------------------------------------------
     * ANALYZE FACEBOOK POST
     * -----------------------------------------------------
     */

    if (
      message.type ===
      "ANALYZE_FACEBOOK_POST"
    ) {
      void analyzeFacebookPost(
        message,
      )
        .then(
          (analysis) => {
            sendResponse({
              success:
                true,

              data:
                analysis,
            });
          },
        )
        .catch(
          (
            error: unknown,
          ) => {
            console.error(
              "[HR ATS Extension] Facebook analysis API failed",
              error,
            );

            sendResponse({
              success:
                false,

              message:
                error instanceof Error
                  ? error.message
                  : "Could not analyze Facebook post",
            });
          },
        );

      return true;
    }

    /*
     * -----------------------------------------------------
     * SAVE CANDIDATE LEAD
     * -----------------------------------------------------
     */

    if (
      message.type ===
      "SAVE_CANDIDATE_LEAD"
    ) {
      console.log(
        "[HR ATS Extension] SAVE_CANDIDATE_LEAD received",
        message.payload,
      );

      void createCandidateLead(
        message.payload,
      )
        .then(
          (lead) => {
            console.log(
              "[HR ATS Extension] Candidate lead created",
              lead,
            );

            sendResponse({
              success:
                true,

              data:
                lead,
            });
          },
        )
        .catch(
          (
            error: unknown,
          ) => {
            console.error(
              "[HR ATS Extension] Candidate lead API failed",
              error,
            );

            sendResponse({
              success:
                false,

              message:
                error instanceof Error
                  ? error.message
                  : "Could not save candidate lead",
            });
          },
        );

      /*
       * สำคัญมาก
       * fetch เป็น async
       */
      return true;
    }

    /*
     * -----------------------------------------------------
     * GENERATE SEARCH QUERIES
     * -----------------------------------------------------
     */

    if (
      message.type ===
      "GENERATE_SEARCH_QUERIES"
    ) {
      console.log(
        "[HR ATS Extension] GENERATE_SEARCH_QUERIES received",
        message.payload,
      );

      void generateSearchQueries(
        message.payload.jobId,
      )
        .then(
          (result) => {
            sendResponse({
              success:
                true,

              data:
                result,
            });
          },
        )
        .catch(
          (
            error: unknown,
          ) => {
            console.error(
              "[HR ATS Extension] Generate search queries failed",
              error,
            );

            sendResponse({
              success:
                false,

              message:
                error instanceof Error
                  ? error.message
                  : "Could not generate search queries",
            });
          },
        );

      /*
       * สำคัญ:
       * ต้อง return true เพราะรอ API
       */
      return true;
    }

    return false;
  },
);

/*
 * =========================================================
 * STORAGE CHANGE LISTENER
 * =========================================================
 *
 * กรณี selectedJob ถูกแก้จากที่อื่น
 * ให้แจ้ง Facebook Content Script ด้วย
 */

chrome.storage.onChanged.addListener(
  (
    changes,
    areaName,
  ) => {
    if (
      areaName !==
      "local" ||
      !changes.selectedJob
    ) {
      return;
    }

    const selectedJob =
      (changes.selectedJob
        .newValue as
        | ExtensionJob
        | undefined) ??
      null;

    console.log(
      "[HR ATS Extension] Selected job changed from storage",
      selectedJob,
    );

    void chrome.tabs
      .query({
        url: [
          "*://*.facebook.com/*",
        ],
      })
      .then(
        async (
          tabs,
        ) => {
          for (
            const tab
            of tabs
          ) {
            if (!tab.id) {
              continue;
            }

            try {
              await chrome.tabs.sendMessage(
                tab.id,
                {
                  type:
                    "SELECTED_JOB_CHANGED",

                  payload: {
                    job:
                      selectedJob,
                  },
                },
              );
            } catch {
              /*
               * Content script อาจยังไม่ถูก inject
               */
            }
          }
        },
      );
  },
);

console.log(
  "[HR ATS Extension] Background service worker loaded",
);