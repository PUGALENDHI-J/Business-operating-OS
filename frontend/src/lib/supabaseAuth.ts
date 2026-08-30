import { supabase, isSupabaseConfigured } from "./supabase";
import { useStore } from "./store";
import { newId, nowIso } from "./id";

export interface AuthResult {
  ok: boolean;
  message: string;
}

/**
 * Ensures the signed-in Supabase Auth user has a `profiles` row (and a
 * `companies` row to go with it), then points the local store's
 * `company.id` at that company so every subsequent sync writes rows under
 * the right company_id. Safe to call on every sign-in — it only creates
 * rows the first time.
 */
async function ensureCompanyAndProfile(userId: string, email: string): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: existingProfile } = await supabase.from("profiles").select("company_id, name").eq("id", userId).maybeSingle();
  if (existingProfile) {
    const local = useStore.getState();
    useStore.getState().setEntities("company", { ...local.company, id: existingProfile.company_id, updated_at: nowIso() });
    return existingProfile.company_id;
  }

  // First sign-in for this account — provision a fresh company + profile,
  // carrying over whatever this device already has as the company name.
  const local = useStore.getState();
  const companyId = newId();
  const { error: companyError } = await supabase.from("companies").insert({
    id: companyId,
    name: local.company.name || "My Business",
    stage: local.company.stage,
    currency: local.company.currency,
  });
  if (companyError) throw new Error(companyError.message);

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    company_id: companyId,
    name: local.currentUser.name || email,
    email,
    role: "OWNER",
  });
  if (profileError) throw new Error(profileError.message);

  useStore.getState().setEntities("company", { ...local.company, id: companyId, updated_at: nowIso() });
  return companyId;
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, message: "Supabase isn't connected." };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, message: error.message };
  if (!data.session) {
    return { ok: true, message: "Account created — check your email to confirm it, then sign in." };
  }
  try {
    await ensureCompanyAndProfile(data.user!.id, email);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Signed up, but couldn't set up your workspace record." };
  }
  return { ok: true, message: "Account created and signed in." };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) return { ok: false, message: "Supabase isn't connected." };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  try {
    await ensureCompanyAndProfile(data.user.id, email);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Signed in, but couldn't load your workspace record." };
  }
  return { ok: true, message: "Signed in." };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
