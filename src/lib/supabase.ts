import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ??
  (import.meta.env["VITE_SUPABASE_PROJECT_URL"] as string | undefined);

const key =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ??
  (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined);

export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export interface Faculty {
  id: number;
  name: string;
  department: string | null;
  scholar_link: string | null;
  orcid_link: string | null;
}

export interface OfficeHour {
  id: number;
  faculty_name: string;
  day: string | null;
  time_slot: string | null;
  status: string | null;
}
