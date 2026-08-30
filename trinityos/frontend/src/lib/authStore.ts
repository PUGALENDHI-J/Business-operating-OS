import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";

interface AuthState {
  session: Session | null;
  initialized: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  initialized: !isSupabaseConfigured, // nothing to wait for if Supabase isn't configured
}));

let started = false;

/** Call once at app startup. No-ops entirely when Supabase isn't configured — local-only usage never touches auth. */
export function initAuth() {
  if (started || !isSupabaseConfigured || !supabase) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({ session: data.session, initialized: true });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ session });
  });
}
