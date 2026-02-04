import { isTrustedCaller } from "@/lib/auth";
import { err, ok } from "@/lib/http";
import { coffeeQuoteSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  try {
    if (!isTrustedCaller(req)) return err("Unauthorized caller", 401);

    const json = await req.json();
    const parsed = coffeeQuoteSchema.safeParse(json);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid payload");

    return ok({
      orderText: parsed.data.orderText,
      estimatedCostUsdc: parsed.data.estimatedCostUsdc,
      finalPriceUsdc: parsed.data.finalPriceUsdc,
      note: "Quote values come from agent skill (Swiggy MCP), backend only stores and relays."
    });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Quote failed", 500);
  }
}
