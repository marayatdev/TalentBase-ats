export interface ExtensionJob {
  id: string;
  title: string;

  description: string | null;
  requirements: string | null;

  minimum_experience_years: number;
  employment_type:
    | "full_time"
    | "part_time"
    | "contract"
    | "internship";

  status:
    | "draft"
    | "open"
    | "closed";
}

export interface StoredJobSelection {
  selectedJob: ExtensionJob | null;
}