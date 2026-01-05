import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we have valid Supabase credentials
const hasValidCredentials = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your-supabase-url' && 
  supabaseAnonKey !== 'your-supabase-anon-key' &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co');

if (!hasValidCredentials) {
  console.warn('Supabase credentials not configured. Using offline mode. Please click "Connect to Supabase" in the top right to set up your database.');
}

// Create client with proper credentials or use a local fallback
export const supabase = hasValidCredentials 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient(
      'https://localhost:54321', 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          fetch: () => Promise.reject(new Error('Supabase not configured. Please set up your database connection.'))
        }
      }
    );

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
        };
        Update: {
          full_name?: string | null;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          target_days: number;
          week_start: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          description?: string | null;
          target_days: number;
          week_start: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          target_days?: number;
        };
      };
      daily_completions: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          date: string;
          completed: boolean;
          created_at: string;
        };
        Insert: {
          goal_id: string;
          user_id: string;
          date: string;
          completed: boolean;
        };
        Update: {
          completed: boolean;
        };
      };
      burnout_checkins: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          stress_level: number;
          sleep_hours: number;
          mood_level: number;
          time_spent_hours: number;
          burnout_score: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          stress_level: number;
          sleep_hours: number;
          mood_level: number;
          time_spent_hours: number;
          burnout_score: number;
        };
        Update: {
          stress_level?: number;
          sleep_hours?: number;
          mood_level?: number;
          time_spent_hours?: number;
          burnout_score?: number;
        };
      };
    };
  };
};