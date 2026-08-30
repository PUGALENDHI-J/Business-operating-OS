import { describe, expect, it } from "vitest";
import { syncAllToSupabase } from "../supabaseSync";

describe("syncAllToSupabase — unconfigured environment", () => {
  it("never reports success when Supabase isn't configured, and says so plainly", async () => {
    // In this test environment there is no VITE_SUPABASE_URL/ANON_KEY, so
    // isSupabaseConfigured is false — the function must not pretend to sync.
    const result = await syncAllToSupabase();
    expect(result.ok).toBe(false);
    expect(result.results[0].error).toMatch(/not connected|isn't connected/i);
  });
});
