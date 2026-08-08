import type {
  FacebookPost,
} from "./facebook-post";
import type {
  ExtensionJob,
} from "./job";

export interface GetJobsMessage {
  type: "GET_OPEN_JOBS";
}

export interface GetSelectedJobMessage {
  type: "GET_SELECTED_JOB";
}

export interface SetSelectedJobMessage {
  type: "SET_SELECTED_JOB";

  payload: {
    job:
      | ExtensionJob
      | null;
  };
}

export interface AnalyzeFacebookPostMessage {
  type:
    "ANALYZE_FACEBOOK_POST";

  payload: {
    post:
      FacebookPost;

    job:
      ExtensionJob;
  };
}

export type ExtensionMessage =
  | GetJobsMessage
  | GetSelectedJobMessage
  | SetSelectedJobMessage
  | AnalyzeFacebookPostMessage;