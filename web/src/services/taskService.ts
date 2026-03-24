import { supabase } from './supabase';
import { getAuthHeaders } from './auth';
import { Task, CreateTaskInput } from '../types/tasks';

export const taskService = {
  getTasksForToday: async (): Promise<Task[]> => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('date', today)
      .eq('is_archived', false)
      .order('time', { ascending: true });

    if (error) {
      console.error('[TaskService] Fetch Error:', error);
      throw error;
    }
    return data || [];
  },

  getOverdueTasks: async (): Promise<Task[]> => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .eq('is_archived', false)
      .lt('date', today)
      .order('date', { ascending: true });

    if (error) throw error;

    // Sort: date asc (already from DB), then urgency (high→medium→low), then time
    const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (data as Task[]).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (uDiff !== 0) return uDiff;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      return 0;
    });
  },

  toggleTaskStatus: async (taskId: string, currentStatus: string): Promise<void> => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      console.error('[TaskService] Toggle Error:', error);
      throw error;
    }
  },

  createTask: async (input: CreateTaskInput): Promise<Task> => {
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          ...input,
          urgency: input.urgency ?? 'medium',
          status: 'pending',
          is_archived: false
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('[TaskService] Create Error:', error);
      throw error;
    }
    return data;
  },

  updateTask: async (taskId: string, updates: Partial<Task>): Promise<void> => {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);
    if (error) throw error;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('[TaskService] Delete Error:', error);
      throw error;
    }
  },

  parseVoiceTranscript: async (transcript: string): Promise<{
    title: string | null;
    description: string | null;
    urgency: 'high' | 'medium' | 'low' | null;
    time: string | null;
  }> => {
    const headers = await getAuthHeaders();
    const backendUrl = import.meta.env.VITE_CLOUD_GATEWAY_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${backendUrl}/tasks/parse-voice`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ transcript }),
    });
    if (response.status === 503) throw new Error('warming');
    if (!response.ok) throw new Error('parse-voice failed');
    return response.json();
  },
};
