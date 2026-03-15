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
}

export type CreateTaskInput = Omit<Task, 'id' | 'user_id' | 'status' | 'is_archived'>;
