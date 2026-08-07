export interface CreateInterviewDto {
  application_id: bigint;
  scheduled_by: bigint;

  title: string;
  description?: string | null;

  start_at: Date;
  end_at: Date;
  timezone: string;

  interviewer_emails: string[];
}

export interface GetApplicationInterviewsQuery {
  application_id: bigint;
}
export interface UpdateInterviewDto {
  title?: string;

  description?: string | null;

  start_at: Date;

  end_at: Date;

  timezone: string;

  interviewer_emails: string[];
}