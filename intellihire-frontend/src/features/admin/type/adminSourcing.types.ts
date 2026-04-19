// src/features/admin/types/adminSourcing.types.ts

export interface AdminSourcingRun {
  sourcing_id:   number;
  job_id:        number | null;
  role:          string;
  status:        string;
  triggered_by:  number | null;
  total_checked: number;
  total_sourced: number;
  created_at:    string;
}

export interface AdminRecruiterStat {
  recruiter_id:   number;
  recruiter_name: string;
  total_runs:     number;
  avg_sourced:    number;
  failed_runs:    number;
  last_active:    string | null;
}

export interface AdminSourcingState {
  runs:    AdminSourcingRun[];
  stats:   AdminRecruiterStat[];
  loading: boolean;
  error:   string | null;
}