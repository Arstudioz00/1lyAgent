import { isTrustedCaller } from "@/lib/auth";
import { err, ok } from "@/lib/http";
import { requestDecisionSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isTrustedCaller(req)) return err("Unauthorized caller", 401);

    const { id } = await params;
    const parsed = requestDecisionSchema.safeParse(await req.json());
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid payload");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("requests")
      .update({
        classification: parsed.data.classification,
        price_usdc: parsed.data.priceUsdc,
        status: parsed.data.status,
        payment_link: parsed.data.paymentLink ?? null
      })
      .eq("id", id);

    if (error) throw error;
    return ok({ id, status: parsed.data.status });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Decision update failed", 500);
  }
}
