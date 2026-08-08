import type { ExtensionJob } from "../types/job";
import type { ExtensionMessage } from "../types/messages";
import type {
  CandidatePostAnalysis,
} from "../types/facebook-post";

const ATS_API_BASE_URL =
  "http://localhost:8000/api";

interface ApiSuccess<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
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

interface ApiErrorResponse {
  success?: boolean;
  status?: number;
  message?: string;
}

function normalizeJob(
  job: JobsResponse["jobs"][number],
): ExtensionJob {
  return {
    id: String(job.id),

    title:
      job.title,

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

async function getOpenJobs(): Promise<
  ExtensionJob[]
> {
  const response =
    await fetch(
      `${ATS_API_BASE_URL}/jobs?page=1&page_size=100&status=open`,
      {
        method: "GET",

        credentials:
          "include",

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
    body.data.jobs ?? []
  ).map(
    normalizeJob,
  );
}

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
      selectedJob:
        job,
    });

    return;
  }

  await chrome.storage.local.remove(
    "selectedJob",
  );
}

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
    await fetch(
      `${ATS_API_BASE_URL}/candidate-imports/analyze-post`,
      {
        method: "POST",

        credentials:
          "include",

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
           * ส่ง Job ID ให้ Backend
           * ไป query Job จากฐานข้อมูล
           */
          job_id:
            job.id,

          /*
           * ส่งค่าเหล่านี้ไว้รองรับ
           * Backend เวอร์ชันเดิมด้วย
           */
          target_position:
            job.title,

          job_description:
            job.description,

          job_requirements:
            job.requirements,

          minimum_experience_years:
            job.minimum_experience_years,

          employment_type:
            job.employment_type,
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

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender,
    sendResponse,
  ) => {
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
            const response: ExtensionResponse<never> =
              {
                success:
                  false,

                message:
                  error instanceof
                  Error
                    ? error.message
                    : "Could not load open jobs",
              };

            sendResponse(
              response,
            );
          },
        );

      /*
       * บอก Chrome ว่าจะตอบกลับแบบ async
       */
      return true;
    }

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
            const response: ExtensionResponse<never> =
              {
                success:
                  false,

                message:
                  error instanceof
                  Error
                    ? error.message
                    : "Could not load selected job",
              };

            sendResponse(
              response,
            );
          },
        );

      return true;
    }

    if (
      message.type ===
      "SET_SELECTED_JOB"
    ) {
      void setSelectedJob(
        message.payload.job,
      )
        .then(
          () => {
            const response: ExtensionResponse<null> =
              {
                success:
                  true,

                data:
                  null,
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
            const response: ExtensionResponse<never> =
              {
                success:
                  false,

                message:
                  error instanceof
                  Error
                    ? error.message
                    : "Could not save selected job",
              };

            sendResponse(
              response,
            );
          },
        );

      return true;
    }

    if (
      message.type ===
      "ANALYZE_FACEBOOK_POST"
    ) {
      void analyzeFacebookPost(
        message,
      )
        .then(
          (analysis) => {
            const response: ExtensionResponse<CandidatePostAnalysis> =
              {
                success:
                  true,

                data:
                  analysis,
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
            const response: ExtensionResponse<never> =
              {
                success:
                  false,

                message:
                  error instanceof
                  Error
                    ? error.message
                    : "Could not analyze Facebook post",
              };

            sendResponse(
              response,
            );
          },
        );

      return true;
    }

    return false;
  },
);