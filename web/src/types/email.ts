export interface Email {
  id: string;
  from: string;
  subject: string;
  body?: string;
  snippet?: string;
  timestamp?: string;
  date?: string;
  is_read?: boolean;
  status?: string;
  source?: 'whitelist' | 'job_filter';
  thread_id?: string;
}

export interface EmailSendRequest {
  to: string;
  subject: string;
  body: string;
  thread_id?: string;
}
