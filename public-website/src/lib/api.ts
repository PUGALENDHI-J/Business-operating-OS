// All read-side data fetching now happens client-side via
// lib/use-public-data.ts (see that file's comment for why: server-side
// fetch() during Next's build/render pipeline is broken in this specific
// environment). This file keeps only the one write-side call, which was
// always meant to run in the browser from a form submit handler anyway.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export interface LeadSubmission {
  full_name: string;
  phone: string;
  email?: string;
  interested_scheme_id?: string;
  message?: string;
  website?: string; // honeypot — always left empty by real visitors
}

export interface LeadSubmitResult {
  ok: boolean;
  error?: string;
}

export async function submitLead(payload: LeadSubmission): Promise<LeadSubmitResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return { ok: false, error: json?.error?.message ?? 'Something went wrong. Please call us instead.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server. Please check your connection or call us instead.' };
  }
}
