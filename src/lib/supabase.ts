// Re-exports the generated Lovable Cloud client so app code has a single import.
import { supabase as generatedSupabase } from "@/integrations/supabase/client";

export const supabase = generatedSupabase;
export const isSupabaseConfigured = true;

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
