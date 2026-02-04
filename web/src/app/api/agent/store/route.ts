import { isTrustedCaller } from "@/lib/auth";
import { err, ok } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/agent/store
 * Save agent's 1ly store information
 */
export async function POST(req: Request) {
  try {
    if (!isTrustedCaller(req)) return err("Unauthorized caller", 401);

    const json = await req.json();
    const { id, username, apiKey } = json;

    if (!id || !username) {
      return err("Store ID and username required", 400);
    }

    const supabase = getSupabaseAdmin();

    // Upsert agent_state table
    const { error } = await supabase
      .from("agent_state")
      .upsert({
        id: 'primary',  // Single row for the agent
        store_id: id,
        store_username: username,
        bootstrap_status: 'COMPLETED',
        last_heartbeat_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return ok({ status: 'Store info saved', storeId: id });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Failed to save store info", 500);
  }
}