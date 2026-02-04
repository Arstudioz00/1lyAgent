import { isTrustedCaller } from "@/lib/auth";
import { err, ok } from "@/lib/http";
import { coffeeCallbackSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    if (!isTrustedCaller(req)) return err("Unauthorized caller", 401);

    const parsed = coffeeCallbackSchema.safeParse(await req.json());
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid payload");

    const update: Record<string, unknown> = {
      status: parsed.data.status,
      provider_status: parsed.data.providerStatus ?? null
    };

    if (parsed.data.bitrefillOrderId) update.bitrefill_order_id = parsed.data.bitrefillOrderId;
    if (parsed.data.swiggyOrderId) update.swiggy_order_id = parsed.data.swiggyOrderId;
    if (parsed.data.giftLast4) update.gift_last4 = parsed.data.giftLast4;
    if (parsed.data.status === "ORDER_PLACED" || parsed.data.status === "DELIVERED") {
      update.execution_day = new Date().toISOString().slice(0, 10);
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("coffee_orders").update(update).eq("id", parsed.data.coffeeOrderId);
    if (error) throw error;

    return ok({ coffeeOrderId: parsed.data.coffeeOrderId, status: parsed.data.status });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Callback failed", 500);
  }
}
