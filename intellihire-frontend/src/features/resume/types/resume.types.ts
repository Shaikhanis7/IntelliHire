export interface Resume {
  id: number;
  candidate_id: number;
  s3_key: string;
  s3_bucket: string;
  source_url: string | null;
  parsed_text: string;
  version: number;
  created_at: Date;
}

export interface ResumeSection {
  section_type: string;
  content: string;
}

export interface ResumeUploadResponse {
  resume_id: number;
  message: string;
}