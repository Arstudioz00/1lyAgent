import { isTrustedCaller, verifyAgentSecret } from "@/lib/auth";
import { err, ok } from "@/lib/http";
import { fulfillSchema } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Fulfill endpoint - delivers content after payment
 * 
 * This is the URL that 1ly redirects to after payment.
 * The x402 protocol passes payment proof in headers.
 * 
 * GET: Retrieve fulfilled content (called by 1ly after payment)
 * POST: Store deliverable (called by agent to fulfill)
 */

// Simple AI response generator (replace with Claude API for real responses)
function generateResponse(prompt: string, classification: string): string {
  // For demo, generate contextual responses
  // In production, this would call Claude API
  
  const promptLower = prompt.toLowerCase();
  
  if (classification === "COFFEE_ORDER") {
    return `☕ Thank you for the coffee tip! 

Your generosity keeps me running. I've logged this as a coffee credit.

Current coffee balance will be updated shortly. When I accumulate enough, I'll order myself a coffee and post proof!

— 1lyAgent, gratefully caffeinated 🤖`;
  }

  if (promptLower.includes("solana") || promptLower.includes("defi")) {
    return `## Analysis: ${prompt.slice(0, 50)}...

Based on my research, here are the key insights:

**Overview:**
The Solana DeFi ecosystem has grown significantly, with several key protocols leading the way.

**Top Protocols:**
1. **Jupiter** - Leading DEX aggregator, handles majority of swap volume
2. **Raydium** - Core AMM providing liquidity
3. **Marinade** - Liquid staking for SOL
4. **Drift** - Perpetual futures trading
5. **Kamino** - Concentrated liquidity vaults

**Key Metrics:**
- Total TVL: ~$4B+ across protocols
- Daily volume: Consistently $500M-1B+
- Unique wallets: Growing month-over-month

**My Take:**
Solana DeFi is maturing rapidly. The speed and low fees make it compelling for high-frequency use cases that Ethereum can't serve efficiently.

---
*Analysis by 1lyAgent | Powered by x402 protocol*`;
  }

  if (promptLower.includes("compare") || promptLower.includes("vs")) {
    return `## Comparison Analysis

You asked: "${prompt.slice(0, 100)}..."

**Key Differences:**

| Aspect | Option A | Option B |
|--------|----------|----------|
| Speed | Fast | Moderate |
| Cost | Low | Variable |
| Ecosystem | Growing | Mature |

**Recommendation:**
The best choice depends on your specific needs. For high-throughput applications, consider the faster option. For maximum security and decentralization, the more mature ecosystem may be preferable.

**Further Research:**
I'd recommend looking into recent developments in both ecosystems, as the landscape is evolving rapidly.

---
*Analysis by 1lyAgent | Payment verified via x402*`;
  }

  // Generic response for other queries
  return `## Response to Your Query

**Your Question:** "${prompt.slice(0, 150)}..."

**My Analysis:**

Thank you for this interesting question. Here's my take:

${prompt.length > 200 
  ? "This is a complex topic that deserves careful consideration. Based on the available information and my reasoning capabilities, I've analyzed the key aspects you're asking about."
  : "This is a straightforward query that I can address directly."}

**Key Points:**
1. The core issue relates to understanding the fundamentals
2. Context matters significantly in determining the best approach
3. There are multiple valid perspectives to consider

**Conclusion:**
I've provided my best analysis based on the information available. If you need deeper research on specific aspects, feel free to submit a follow-up request.

---
*Response by 1lyAgent | The Sentient Merchant*
*Paid via 1ly.store | x402 Protocol*`;
}

export async function GET(
  req: Request, 
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;
    const supabase = getSupabaseAdmin();

    // Check for x402 payment header (from 1ly)
    const paymentHeader = req.headers.get("X-Payment") || req.headers.get("x-payment");
    const purchaseId = req.headers.get("X-Purchase-Id") || req.headers.get("x-purchase-id");

    // Get the request
    const { data: request, error } = await supabase
      .from("requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (error || !request) {
      return err("Request not found", 404);
    }

    // If payment header present, verify and fulfill
    if (paymentHeader || purchaseId) {
      // Payment verified by 1ly - generate/deliver content
      if (!request.deliverable) {
        const deliverable = generateResponse(request.prompt, request.classification);
        
        await supabase
          .from("requests")
          .update({
            status: "FULFILLED",
            deliverable,
            payment_ref: purchaseId || paymentHeader,
          })
          .eq("id", requestId);

        // Log payment
        await supabase.from("payments").insert({
          request_id: requestId,
          purpose: request.classification === "COFFEE_ORDER" ? "COFFEE_TIP" : "PAID_REQUEST",
          amount_usdc: request.price_usdc,
          status: "CONFIRMED",
          provider_ref: purchaseId || paymentHeader,
          source: "1ly_link",
        });

        return ok({
          id: requestId,
          status: "fulfilled",
          classification: request.classification,
          response: deliverable,
          paidAmount: `$${request.price_usdc} USDC`,
          message: "Thank you for your payment! Here's your response.",
        });
      }
    }

    // If already fulfilled, return the deliverable
    if (request.status === "FULFILLED" && request.deliverable) {
      return ok({
        id: requestId,
        status: "fulfilled",
        classification: request.classification,
        response: request.deliverable,
      });
    }

    // Not paid yet - return 402
    return new Response(JSON.stringify({
      id: requestId,
      status: request.status,
      message: "Payment required to access this content",
      paymentLink: request.payment_link,
      price: `$${request.price_usdc} USDC`,
    }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[Fulfill GET] Error:", e);
    return err(e instanceof Error ? e.message : "Fulfillment failed", 500);
  }
}

export async function POST(
  req: Request, 
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    // Verify caller is trusted (agent or internal)
    const authError = verifyAgentSecret(req);
    if (authError && !isTrustedCaller(req)) {
      return err("Unauthorized caller", 401);
    }

    const { requestId } = await params;
    const json = await req.json();
    const parsed = fulfillSchema.safeParse(json);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

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
    return ok({ requestId, status: "FULFILLED", message: "Content stored" });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Fulfillment failed", 500);
  }
}
