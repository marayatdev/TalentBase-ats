import type {
  FacebookPost,
} from "./facebook-post";

import type {
  ExtensionJob,
} from "./job";

import type {
  CreateCandidateLeadPayload,
} from "./candidate-lead";

export interface GetJobsMessage {
  type: "GET_OPEN_JOBS";
}

export interface GetSelectedJobMessage {
  type: "GET_SELECTED_JOB";
}

export interface SetSelectedJobMessage {
  type: "SET_SELECTED_JOB";

  payload: {
    job: ExtensionJob | null;
  };
}

export interface AnalyzeFacebookPostMessage {
  type: "ANALYZE_FACEBOOK_POST";

  payload: {
    post: FacebookPost;
    job: ExtensionJob;
  };
}

export interface SaveCandidateLeadMessage {
  type: "SAVE_CANDIDATE_LEAD";

  payload: CreateCandidateLeadPayload;
}

export interface GenerateSearchQueriesMessage {
  type: "GENERATE_SEARCH_QUERIES";

  payload: {
    jobId: string;
  };
}

export type ExtensionMessage =
  | {
    type: "GET_OPEN_JOBS";
  }
  | {
    type: "GET_SELECTED_JOB";
  }
  | {
    type: "SET_SELECTED_JOB";
    payload: {
      job: ExtensionJob | null;
    };
  }
  | {
    type: "ANALYZE_FACEBOOK_POST";
    payload: {
      post: FacebookPost;
      job: ExtensionJob;
    };
  }
  | {
    type: "SAVE_CANDIDATE_LEAD";
    payload: CreateCandidateLeadPayload;
  }
  | {
    type: "GENERATE_SEARCH_QUERIES";
    payload: {
      jobId: string;
    };
  }

  | {
    type: "EXTENSION_LOGIN";
    payload: {
      email: string;
      password: string;
    };
  }
  | {
    type: "GET_AUTH_SESSION";
  }
  | {
    type: "EXTENSION_LOGOUT";
  };

