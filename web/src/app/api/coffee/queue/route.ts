import { isTrustedCaller } from "@/lib/auth";
import { err, ok } from "@/lib/http";
import { coffeeQueueSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    if (!isTrustedCaller(req)) return err("Unauthorized caller", 401);

    const json = await req.json();
    const parsed = coffeeQueueSchema.safeParse(json);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid payload");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("coffee_orders")
      .insert({
        order_text: parsed.data.orderText,
        estimated_cost_usdc: parsed.data.estimatedCostUsdc,
        final_price_usdc: parsed.data.finalPriceUsdc,
        sponsor_type: parsed.data.sponsorType,
        status: "QUEUED"
      })
      .select("id, status")
      .single();

    if (error) throw error;
    return ok(data, 201);
  } catch (e) {
    return err(e instanceof Error ? e.message : "Queue failed", 500);
  }
}
