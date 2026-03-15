import { supabase } from './supabase';
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

  deleteTask: async (taskId: string): Promise<void> => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('[TaskService] Delete Error:', error);
      throw error;
    }
  }
};
