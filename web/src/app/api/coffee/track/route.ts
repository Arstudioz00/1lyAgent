import { isTrustedCaller } from "@/lib/auth";
import { err, ok } from "@/lib/http";
import { coffeeTrackSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    if (!isTrustedCaller(req)) return err("Unauthorized caller", 401);

    const parsed = coffeeTrackSchema.safeParse(await req.json());
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid payload");

    const status = parsed.data.delivered ? "DELIVERED" : "ORDER_PLACED";
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("coffee_orders")
      .update({ status, provider_status: parsed.data.providerStatus ?? null })
      .eq("id", parsed.data.coffeeOrderId);
    if (error) throw error;

    return ok({ coffeeOrderId: parsed.data.coffeeOrderId, status });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Track failed", 500);
  }
}
