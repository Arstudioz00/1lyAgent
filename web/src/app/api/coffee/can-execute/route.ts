import { isTrustedCaller } from "@/lib/auth";
import { env } from "@/lib/env";
import { err, ok } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    if (!isTrustedCaller(req)) return err("Unauthorized caller", 401);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("coffee_state").select("daily_exec_count,next_batch_ts").limit(1).maybeSingle();
    if (error) throw error;

    const count = data?.daily_exec_count ?? 0;
    const nextBatch = data?.next_batch_ts ? new Date(data.next_batch_ts).getTime() : 0;
    const now = Date.now();

    const canExecute = count < env.maxSwiggyExecPerDay && now >= nextBatch;
    return ok({ canExecute, reason: canExecute ? "READY" : "LIMIT_OR_WINDOW" });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Check failed", 500);
  }
}
