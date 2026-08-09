import type {
  ExtensionJob,
} from "../types/job";

import type {
  ExtensionMessage,
} from "../types/messages";

import type {
  CandidatePostAnalysis,
} from "../types/facebook-post";

import type {
  CandidateLead,
  CreateCandidateLeadPayload,
} from "../types/candidate-lead";

const ATS_API_BASE_URL =
  "https://talentbase-ats-production.up.railway.app/api";

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

interface ExtensionAuthData {
  accessToken: string;
  user: ExtensionUser;
}

const ACCESS_TOKEN_KEY = "accessToken";
const EXTENSION_USER_KEY = "extensionUser";

async function getAccessToken(): Promise<string | null> {
  const stored = await chrome.storage.local.get(ACCESS_TOKEN_KEY);
  return typeof stored[ACCESS_TOKEN_KEY] === "string"
    ? stored[ACCESS_TOKEN_KEY]
    : null;
}

async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new Error("Please login to TalentBase ATS first");
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${ATS_API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    await chrome.storage.local.remove([
      ACCESS_TOKEN_KEY,
      EXTENSION_USER_KEY,
      "selectedJob",
    ]);
  }

  return response;
}

async function login(
  email: string,
  password: string,
): Promise<ExtensionUser> {
  const response = await fetch(`${ATS_API_BASE_URL}/auth/extension-login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(
      await parseErrorMessage(response, `Login failed (${response.status})`),
    );
  }

  const body = (await response.json()) as ApiSuccess<ExtensionAuthData>;

  if (!body.data?.accessToken || !body.data.user) {
    throw new Error("Login response did not contain an access token");
  }

  await chrome.storage.local.set({
    [ACCESS_TOKEN_KEY]: body.data.accessToken,
    [EXTENSION_USER_KEY]: body.data.user,
  });

  return body.data.user;
}

async function logout(): Promise<void> {
  await chrome.storage.local.remove([
    ACCESS_TOKEN_KEY,
    EXTENSION_USER_KEY,
    "selectedJob",
  ]);
}

async function getAuthSession(): Promise<{
  isAuthenticated: boolean;
  user: ExtensionUser | null;
}> {
  const stored = await chrome.storage.local.get([
    ACCESS_TOKEN_KEY,
    EXTENSION_USER_KEY,
  ]);

  return {
    isAuthenticated:
      typeof stored[ACCESS_TOKEN_KEY] === "string" &&
      stored[ACCESS_TOKEN_KEY].length > 0,
    user:
      (stored[EXTENSION_USER_KEY] as ExtensionUser | undefined) ?? null,
  };
}

function normalizeJob(
  job: JobsResponse["jobs"][number],
): ExtensionJob {
  return {
    id:
      String(job.id),

    title:
      job.title,

    description:
      job.description ??
      null,

    requirements:
      job.requirements ??
      null,

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
 * โหลด Job ที่เปิดรับสมัครอยู่
 */
async function getOpenJobs(): Promise<
  ExtensionJob[]
> {
  const response =
    await authenticatedFetch(
      "/jobs?page=1&page_size=100&status=open",
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  if (!response.ok) {
    const message =
      await parseErrorMessage(
        response,
        `Could not load jobs (${response.status})`,
      );

    throw new Error(
      message,
    );
  }

  const body =
    (await response.json()) as ApiSuccess<JobsResponse>;

  return (
    body.data.jobs ??
    []
  ).map(
    normalizeJob,
  );
}

/*
 * อ่าน Job ที่ HR เลือก
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

/*
 * Save Job ที่ HR เลือก
 */
async function setSelectedJob(
  job: ExtensionJob | null,
): Promise<void> {
  if (job) {
    await chrome.storage.local.set({
      selectedJob:
        job,
    });

    return;
  }

  await chrome.storage.local.remove(
    "selectedJob",
  );
}

/*
 * วิเคราะห์ Facebook Post
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

  if (
    !post?.text?.trim()
  ) {
    throw new Error(
      "Facebook post text is empty",
    );
  }

  const response =
    await authenticatedFetch(
      "/candidate-imports/analyze-post",
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          source:
            "facebook",

          source_url:
            post.url ??
            null,

          raw_text:
            post.text,

          /*
           * สำคัญ:
           * Backend จะใช้ job_id
           * query Job จริงจาก Database
           */
          job_id:
            job.id,

          /*
           * ส่งไว้เพื่อ backward compatibility
           */
          target_position:
            job.title,
        }),
      },
    );

  if (!response.ok) {
    const message =
      await parseErrorMessage(
        response,
        `Could not analyze Facebook post (${response.status})`,
      );

    throw new Error(
      message,
    );
  }

  const body =
    (await response.json()) as ApiSuccess<CandidatePostAnalysis>;

  if (!body.data) {
    throw new Error(
      "AI analysis result was not returned",
    );
  }

  return body.data;
}

/*
 * Save Candidate Lead เข้า ATS
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

        /*
         * ถ้า ATS authentication
         * ใช้ cookie ต้องมีบรรทัดนี้
         */

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
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

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender,
    sendResponse,
  ) => {
    const authMessage = message as unknown as {
      type: string;
      payload?: {
        email?: string;
        password?: string;
      };
    };

    if (authMessage.type === "EXTENSION_LOGIN") {
      const email = authMessage.payload?.email?.trim() ?? "";
      const password = authMessage.payload?.password ?? "";

      if (!email || !password) {
        sendResponse({
          success: false,
          message: "Email and password are required",
        });
        return false;
      }

      void login(email, password)
        .then((user) => sendResponse({ success: true, data: user }))
        .catch((error: unknown) =>
          sendResponse({
            success: false,
            message: error instanceof Error ? error.message : "Could not login",
          }),
        );

      return true;
    }

    if (authMessage.type === "EXTENSION_LOGOUT") {
      void logout()
        .then(() => sendResponse({ success: true, data: null }))
        .catch((error: unknown) =>
          sendResponse({
            success: false,
            message: error instanceof Error ? error.message : "Could not logout",
          }),
        );

      return true;
    }

    if (authMessage.type === "GET_AUTH_SESSION") {
      void getAuthSession()
        .then((session) => sendResponse({ success: true, data: session }))
        .catch((error: unknown) =>
          sendResponse({
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Could not load auth session",
          }),
        );

      return true;
    }

    /*
     * GET OPEN JOBS
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

      return true;
    }

    /*
     * GET SELECTED JOB
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
     * SET SELECTED JOB
     */
    if (
      message.type ===
      "SET_SELECTED_JOB"
    ) {
      void setSelectedJob(
        message.payload.job,
      )
        .then(
          () => {
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
     * AI ANALYZE FACEBOOK POST
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
     * SAVE CANDIDATE LEAD
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
            const message =
              error instanceof Error
                ? error.message
                : "Could not save candidate lead";

            console.error(
              "[HR ATS Extension] Candidate lead API failed",
              error,
            );

            sendResponse({
              success:
                false,

              message,
            });
          },
        );

      /*
       * สำคัญมาก
       *
       * ต้อง return true
       * เพราะ fetch เป็น async
       * ไม่อย่างนั้น message channel
       * จะถูกปิดก่อน sendResponse()
       */
      return true;
    }

    return false;
  },
);