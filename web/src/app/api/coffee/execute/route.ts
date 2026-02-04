import { isAdmin, isTrustedCaller } from "@/lib/auth";
import { env } from "@/lib/env";
import { err, ok } from "@/lib/http";
import { coffeeExecuteSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const parsed = coffeeExecuteSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid payload");

    const admin = isAdmin(req.headers.get("authorization"));
    if (parsed.data.force && !admin) return err("Admin authorization required for force execution", 403);
    if (!isTrustedCaller(req)) return err("Unauthorized caller", 401);

    const supabase = getSupabaseAdmin();
    const { data: state, error: stateErr } = await supabase
      .from("coffee_state")
      .select("id,daily_exec_count,next_batch_ts")
      .limit(1)
      .maybeSingle();
    if (stateErr) throw stateErr;

    const nowMs = Date.now();
    const nextBatchMs = state?.next_batch_ts ? new Date(state.next_batch_ts).getTime() : 0;

    if (!parsed.data.force && (state?.daily_exec_count ?? 0) >= env.maxSwiggyExecPerDay) {
      return err("Daily execution limit reached", 429);
    }
    if (!parsed.data.force && nextBatchMs > nowMs) {
      return err("Batch window not reached", 429);
    }

    let query = supabase
      .from("coffee_orders")
      .select("id,order_text,final_price_usdc,status")
      .eq("status", "QUEUED")
      .order("created_at", { ascending: true })
      .limit(1);

    if (parsed.data.coffeeOrderId) {
      query = supabase
        .from("coffee_orders")
        .select("id,order_text,final_price_usdc,status")
        .eq("id", parsed.data.coffeeOrderId)
        .eq("status", "QUEUED")
        .limit(1);
    }

    const { data: order, error: orderErr } = await query.maybeSingle();
    if (orderErr) throw orderErr;
    if (!order) return err("No queued orders", 404);

    const { error: updateOrderErr } = await supabase
      .from("coffee_orders")
      .update({ status: "EXECUTING" })
      .eq("id", order.id);
    if (updateOrderErr) throw updateOrderErr;

    if (state?.id) {
      const nextBatch = new Date(nowMs + env.coffeeBatchIntervalHours * 60 * 60 * 1000).toISOString();
      const { error: updateStateErr } = await supabase
        .from("coffee_state")
        .update({
          daily_exec_count: (state.daily_exec_count ?? 0) + 1,
          next_batch_ts: nextBatch
        })
        .eq("id", state.id);
      if (updateStateErr) throw updateStateErr;
    }

    return ok({
      coffeeOrderId: order.id,
      status: "EXECUTING",
      orderText: order.order_text,
      finalPriceUsdc: Number(order.final_price_usdc),
      note: "Agent must now execute Bitrefill + Swiggy MCP and report results via /api/coffee/callback."
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Execute failed", 500);
  }
}
