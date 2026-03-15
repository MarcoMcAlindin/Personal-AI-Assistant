export interface Email {
  id: string;
  from: string;
  subject: string;
  body: string;
  timestamp: string;
  is_read: boolean;
  status: 'whitelisted' | 'pending';
  thread_id?: string;
}

export interface EmailSendRequest {
  to: string;
  subject: string;
  body: string;
  thread_id?: string;
}
