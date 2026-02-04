import { isTrustedCaller } from "@/lib/auth";
import { err, ok } from "@/lib/http";
import { fulfillSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    if (!isTrustedCaller(req)) return err("Unauthorized caller", 401);

    const { requestId } = await params;
    const json = await req.json();
    const parsed = fulfillSchema.safeParse(json);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid payload");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("requests")
      .update({
        status: "FULFILLED",
        deliverable: parsed.data.deliverable,
        payment_ref: parsed.data.paymentRef ?? null,
        classification: parsed.data.classification ?? undefined
      })
      .eq("id", requestId);

    if (error) throw error;
    return ok({ requestId, status: "FULFILLED" });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Fulfillment failed", 500);
  }
}
