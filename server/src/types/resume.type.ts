export interface CreateResumeDto {
  candidate_id: bigint;
  original_file_name: string;
  file_url: string;
  mime_type?: string;
  file_size?: bigint;
  is_primary?: boolean;
}

export interface UpdateResumePrimaryDto {
  is_primary: boolean;
}
