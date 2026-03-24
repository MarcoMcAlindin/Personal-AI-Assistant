export interface Task {
  id: string;
  user_id: string;
  date: string;
  title: string;
  description: string | null;
  duration: number | null;
  time: string | null;
  status: 'pending' | 'completed' | 'archived';
  is_archived: boolean;
  urgency: 'high' | 'medium' | 'low';
}

export type CreateTaskInput = Omit<Task, 'id' | 'user_id' | 'status' | 'is_archived'>;

// Used by the add-task form and VoiceTaskInput
export interface TaskFormFields {
  title: string;
  description: string | null;
  time: string | null;
  urgency: 'high' | 'medium' | 'low';
  date: string;   // YYYY-MM-DD, resolved from Today/Tomorrow toggle
}
