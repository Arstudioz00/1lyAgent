import { isTrustedCaller } from "@/lib/auth";
import { err, ok } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/agent/pending
 * Returns requests that need classification/processing by the agent
 */
export async function GET(req: Request) {
  try {
    if (!isTrustedCaller(req)) return err("Unauthorized caller", 401);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .eq("status", "NEW")
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) throw error;

    return ok({ requests: data || [] });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to fetch pending requests", 500);
  }
}