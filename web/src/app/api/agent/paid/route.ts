import { isTrustedCaller } from "@/lib/auth";
import { err, ok } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/agent/paid
 * Returns requests that have been paid and need fulfillment
 */
export async function GET(req: Request) {
  try {
    if (!isTrustedCaller(req)) return err("Unauthorized caller", 401);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("requests")
      .select("*")
      .eq("status", "PAID")
      .order("created_at", { ascending: true })
      .limit(5);

    if (error) throw error;

    return ok({ requests: data || [] });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to fetch paid requests", 500);
  }
}