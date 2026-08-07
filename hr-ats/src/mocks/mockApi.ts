import type { Paginated } from "@/types/api";
import {
  mockJobs,
  mockCandidates,
  mockStagesByJob,
  mockApplications,
  mockResumesByCandidate,
  mockAIResumeResults,
  mockAIJobMatches,
  mockImports,
  mockDashboard,
} from "./data";
import type { Job, Candidate, Application, ImportSource } from "@/types/domain";

const DELAY = 350;
const wait = (ms = DELAY) => new Promise((res) => setTimeout(res, ms));

function paginate<T>(items: T[], page = 1, pageSize = 10): Paginated<T> {
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return {
    items: pageItems,
    total: items.length,
    page,
    page_size: pageSize,
    total_pages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

export const mockApi = {
  dashboard: async () => {
    await wait();
    return mockDashboard;
  },

  jobs: {
    list: async (page = 1, pageSize = 10, search = "", status?: string, employmentType?: string): Promise<Paginated<Job>> => {
      await wait();
      let items = mockJobs.slice();
      if (search) items = items.filter((j) => j.title.toLowerCase().includes(search.toLowerCase()));
      if (status) items = items.filter((j) => j.status === status);
      if (employmentType) items = items.filter((j) => j.employment_type === employmentType);
      return paginate(items, page, pageSize);
    },
    get: async (id: string): Promise<Job> => {
      await wait();
      const job = mockJobs.find((j) => j.id === id);
      if (!job) throw new Error("Job not found");
      return job;
    },
  },

  candidates: {
    list: async (page = 1, pageSize = 10, search = "", source?: string): Promise<Paginated<Candidate>> => {
      await wait();
      let items = mockCandidates.slice();
      if (search) {
        const s = search.toLowerCase();
        items = items.filter(
          (c) =>
            c.full_name.toLowerCase().includes(s) ||
            c.email.toLowerCase().includes(s) ||
            (c.current_position ?? "").toLowerCase().includes(s) ||
            (c.phone ?? "").includes(s)
        );
      }
      if (source) items = items.filter((c) => c.source === source);
      return paginate(items, page, pageSize);
    },
    get: async (id: string): Promise<Candidate> => {
      await wait();
      const candidate = mockCandidates.find((c) => c.id === id);
      if (!candidate) throw new Error("Candidate not found");
      return candidate;
    },
  },

  pipelineStages: {
    forJob: async (jobId: string) => {
      await wait();
      return mockStagesByJob[jobId] ?? [];
    },
  },

  applications: {
    list: async (page = 1, pageSize = 10, filters: { job_id?: string; stage_id?: string; status?: string; search?: string } = {}): Promise<Paginated<Application>> => {
      await wait();
      let items = mockApplications.slice();
      if (filters.job_id) items = items.filter((a) => a.job.id === filters.job_id);
      if (filters.status) items = items.filter((a) => a.status === filters.status);
      if (filters.stage_id) items = items.filter((a) => a.current_stage.id === filters.stage_id);
      if (filters.search) {
        const s = filters.search.toLowerCase();
        items = items.filter((a) => a.candidate.full_name.toLowerCase().includes(s));
      }
      return paginate(items, page, pageSize);
    },
    get: async (id: string): Promise<Application> => {
      await wait();
      const app = mockApplications.find((a) => a.id === id);
      if (!app) throw new Error("Application not found");
      return app;
    },
    byJobKanban: async (jobId: string) => {
      await wait();
      return mockApplications.filter((a) => a.job.id === jobId);
    },
  },

  resumes: {
    forCandidate: async (candidateId: string) => {
      await wait();
      return mockResumesByCandidate[candidateId] ?? [];
    },
  },

  aiResumes: {
    result: async (resumeId: string) => {
      await wait();
      return mockAIResumeResults[resumeId] ?? null;
    },
  },

  aiJobMatches: {
    forApplication: async (applicationId: string) => {
      await wait();
      return mockAIJobMatches[applicationId] ?? null;
    },
  },

  candidateImports: {
    history: async (page = 1, pageSize = 10) => {
      await wait();
      return paginate(mockImports, page, pageSize);
    },
    parseText: async (rawText: string, source: ImportSource) => {
      await wait(700);
      return {
        full_name: "Extracted Candidate",
        email: "extracted.candidate@example.com",
        phone: "0800000000",
        current_position: "Applicant",
        target_position: "Open Position",
        summary: rawText.slice(0, 160) || "No summary available from the provided text.",
        skills: ["Communication", "Teamwork"],
        source,
      };
    },
  },
};
