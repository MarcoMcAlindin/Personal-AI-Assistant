export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          application_method: string | null
          applied_at: string | null
          campaign_id: string | null
          cover_letter_metadata: Json | null
          cover_letter_text: string
          created_at: string | null
          id: string
          inbox_item_id: string | null
          interview_dates: Json | null
          next_followup_date: string | null
          offer_details: Json | null
          status: Database["public"]["Enums"]["application_status"] | null
          updated_at: string | null
          user_id: string | null
          user_notes: string | null
        }
        Insert: {
          application_method?: string | null
          applied_at?: string | null
          campaign_id?: string | null
          cover_letter_metadata?: Json | null
          cover_letter_text: string
          created_at?: string | null
          id?: string
          inbox_item_id?: string | null
          interview_dates?: Json | null
          next_followup_date?: string | null
          offer_details?: Json | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
          user_id?: string | null
          user_notes?: string | null
        }
        Update: {
          application_method?: string | null
          applied_at?: string | null
          campaign_id?: string | null
          cover_letter_metadata?: Json | null
          cover_letter_text?: string
          created_at?: string | null
          id?: string
          inbox_item_id?: string | null
          interview_dates?: Json | null
          next_followup_date?: string | null
          offer_details?: Json | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
          user_id?: string | null
          user_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_inbox_item_id_fkey"
            columns: ["inbox_item_id"]
            isOneToOne: true
            referencedRelation: "inbox_items"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ai_analysis: Json | null
          created_at: string | null
          cv_file_id: string | null
          error_count: number | null
          id: string
          job_preferences: Json
          last_error: string | null
          last_run_at: string | null
          max_results_per_run: number | null
          name: string
          next_run_at: string | null
          search_frequency_hours: number | null
          search_sources: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          total_jobs_found: number | null
          total_jobs_matched: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string | null
          cv_file_id?: string | null
          error_count?: number | null
          id?: string
          job_preferences?: Json
          last_error?: string | null
          last_run_at?: string | null
          max_results_per_run?: number | null
          name: string
          next_run_at?: string | null
          search_frequency_hours?: number | null
          search_sources?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          total_jobs_found?: number | null
          total_jobs_matched?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string | null
          cv_file_id?: string | null
          error_count?: number | null
          id?: string
          job_preferences?: Json
          last_error?: string | null
          last_run_at?: string | null
          max_results_per_run?: number | null
          name?: string
          next_run_at?: string | null
          search_frequency_hours?: number | null
          search_sources?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          total_jobs_found?: number | null
          total_jobs_matched?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_cv_file_id_fkey"
            columns: ["cv_file_id"]
            isOneToOne: false
            referencedRelation: "cv_files"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_history: {
        Row: {
          embedding: string | null
          id: string
          is_saved: boolean | null
          message: string
          role: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          embedding?: string | null
          id?: string
          is_saved?: boolean | null
          message: string
          role: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          embedding?: string | null
          id?: string
          is_saved?: boolean | null
          message?: string
          role?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_files: {
        Row: {
          embedding: string | null
          file_size_bytes: number
          filename: string
          id: string
          is_primary: boolean | null
          mime_type: string
          parsed_metadata: Json | null
          parsed_text: string | null
          storage_path: string
          uploaded_at: string | null
          user_id: string | null
        }
        Insert: {
          embedding?: string | null
          file_size_bytes: number
          filename: string
          id?: string
          is_primary?: boolean | null
          mime_type: string
          parsed_metadata?: Json | null
          parsed_text?: string | null
          storage_path: string
          uploaded_at?: string | null
          user_id?: string | null
        }
        Update: {
          embedding?: string | null
          file_size_bytes?: number
          filename?: string
          id?: string
          is_primary?: boolean | null
          mime_type?: string
          parsed_metadata?: Json | null
          parsed_text?: string | null
          storage_path?: string
          uploaded_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_whitelist: {
        Row: {
          contact_name: string | null
          created_at: string | null
          email_address: string
          id: string
          user_id: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          email_address: string
          id?: string
          user_id: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          email_address?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_whitelist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      health_metrics: {
        Row: {
          ai_analysis: string | null
          avg_heart_rate: number | null
          date: string
          id: string
          raw_watch_data: Json | null
          sleep_duration: number | null
          user_id: string
          water_liters: number | null
        }
        Insert: {
          ai_analysis?: string | null
          avg_heart_rate?: number | null
          date: string
          id?: string
          raw_watch_data?: Json | null
          sleep_duration?: number | null
          user_id: string
          water_liters?: number | null
        }
        Update: {
          ai_analysis?: string | null
          avg_heart_rate?: number | null
          date?: string
          id?: string
          raw_watch_data?: Json | null
          sleep_duration?: number | null
          user_id?: string
          water_liters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          campaign_id: string | null
          company_logo_url: string | null
          company_name: string
          discovered_at: string | null
          embedding: string | null
          expires_at: string | null
          external_job_id: string | null
          extracted_requirements: Json | null
          id: string
          job_description: string
          job_description_html: string | null
          job_title: string
          job_url: string
          keyword_matches: Json | null
          location: string | null
          match_reasoning: string | null
          match_score: number | null
          metadata: Json | null
          remote_type: string | null
          reviewed_at: string | null
          salary_range: string | null
          source: string
          status: Database["public"]["Enums"]["inbox_status"] | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          company_logo_url?: string | null
          company_name: string
          discovered_at?: string | null
          embedding?: string | null
          expires_at?: string | null
          external_job_id?: string | null
          extracted_requirements?: Json | null
          id?: string
          job_description: string
          job_description_html?: string | null
          job_title: string
          job_url: string
          keyword_matches?: Json | null
          location?: string | null
          match_reasoning?: string | null
          match_score?: number | null
          metadata?: Json | null
          remote_type?: string | null
          reviewed_at?: string | null
          salary_range?: string | null
          source: string
          status?: Database["public"]["Enums"]["inbox_status"] | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          company_logo_url?: string | null
          company_name?: string
          discovered_at?: string | null
          embedding?: string | null
          expires_at?: string | null
          external_job_id?: string | null
          extracted_requirements?: Json | null
          id?: string
          job_description?: string
          job_description_html?: string | null
          job_title?: string
          job_url?: string
          keyword_matches?: Json | null
          location?: string | null
          match_reasoning?: string | null
          match_score?: number | null
          metadata?: Json | null
          remote_type?: string | null
          reviewed_at?: string | null
          salary_range?: string | null
          source?: string
          status?: Database["public"]["Enums"]["inbox_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_logs: {
        Row: {
          campaign_id: string | null
          completed_at: string | null
          duration_ms: number | null
          error: string | null
          id: string
          metadata: Json | null
          results_count: number | null
          search_query: string
          source: string
          started_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json | null
          results_count?: number | null
          search_query: string
          source: string
          started_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          error?: string | null
          id?: string
          metadata?: Json | null
          results_count?: number | null
          search_query?: string
          source?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          date: string
          description: string | null
          duration: number | null
          id: string
          is_archived: boolean | null
          status: string | null
          time: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          date: string
          description?: string | null
          duration?: number | null
          id?: string
          is_archived?: boolean | null
          status?: string | null
          time?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          date?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_archived?: boolean | null
          status?: string | null
          time?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          oauth_tokens: Json | null
          settings: Json | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          oauth_tokens?: Json | null
          settings?: Json | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          oauth_tokens?: Json | null
          settings?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_cv_to_jobs: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          company_name: string
          job_id: string
          job_title: string
          similarity: number
        }[]
      }
    }
    Enums: {
      application_status:
        | "READY_TO_APPLY"
        | "APPLIED"
        | "INTERVIEWING"
        | "OFFER_RECEIVED"
        | "REJECTED"
        | "WITHDRAWN"
      campaign_status: "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED"
      inbox_status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "EXPIRED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: [
        "READY_TO_APPLY",
        "APPLIED",
        "INTERVIEWING",
        "OFFER_RECEIVED",
        "REJECTED",
        "WITHDRAWN",
      ],
      campaign_status: ["DRAFT", "RUNNING", "PAUSED", "COMPLETED", "FAILED"],
      inbox_status: ["PENDING_REVIEW", "APPROVED", "REJECTED", "EXPIRED"],
    },
  },
} as const
