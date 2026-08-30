import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Whether a Supabase project has actually been configured for this
 * deployment. Sync/migration UI must check this and show an honest message
 * rather than pretending to sync when it can't (spec Sections 47, 49, 81 —
 * "no fake functionality").
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url!, anonKey!) : null;
