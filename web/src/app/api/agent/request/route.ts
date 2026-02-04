import { err, ok } from "@/lib/http";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requestSchema } from "@/lib/schemas";
import { classifyRequest, getFreeResponse, getPaymentRequiredResponse } from "@/lib/oracle";

/**
 * Agent Request Endpoint
 * 
 * The "Reasoning Oracle" - classifies requests and prices them
 * 
 * Flow:
 * 1. Receive prompt
 * 2. Classify (FREE / PAID_MEDIUM / PAID_HEAVY / COFFEE)
 * 3. If FREE → respond immediately
 * 4. If PAID → create 1ly link, return 402
 * 5. After payment → fulfill via webhook
 */

const STORE_USERNAME = "1lyagent";

// Static links - already created on 1ly.store
const PAYMENT_LINKS = {
  PAID_MEDIUM: `https://1ly.store/${STORE_USERNAME}/ask`,
  PAID_HEAVY: `https://1ly.store/${STORE_USERNAME}/ask`,
  COFFEE_ORDER: `https://1ly.store/${STORE_USERNAME}/tip`,
} as const;

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  
  try {
    const json = await req.json();
    const parsed = requestSchema.safeParse({ ...json, source: json.source || "external_agent" });
    
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const { prompt, source } = parsed.data;

    // 1. Classify the request
    const oracle = classifyRequest(prompt);
    console.log(`[Oracle] Classified: ${oracle.classification} ($${oracle.price}) - ${oracle.reasoning}`);

    // 2. Store the request
    const { data: request, error: insertError } = await supabase
      .from("requests")
      .insert({
        prompt,
        source,
        classification: oracle.classification,
        price_usdc: oracle.price,
        status: oracle.shouldCreateLink ? "NEW" : "FULFILLED",
      })
      .select("id, classification, price_usdc, status")
      .single();

    if (insertError) throw insertError;

    // 3. Handle based on classification
    if (!oracle.shouldCreateLink) {
      // FREE - respond immediately
      const freeResponse = getFreeResponse(prompt);
      
      // Update with deliverable
      await supabase
        .from("requests")
        .update({ 
          deliverable: freeResponse,
          status: "FULFILLED"
        })
        .eq("id", request.id);

      return ok({
        id: request.id,
        classification: oracle.classification,
        price: 0,
        status: "fulfilled",
        response: freeResponse,
        reasoning: oracle.reasoning,
      });
    }

    // 4. PAID - use static payment links
    const paymentLink = PAYMENT_LINKS[oracle.classification as keyof typeof PAYMENT_LINKS] 
      || PAYMENT_LINKS.PAID_MEDIUM;

    // Update request with payment link
    await supabase
      .from("requests")
      .update({ 
        payment_link: paymentLink,
        status: "LINK_CREATED"
      })
      .eq("id", request.id);

    // 5. Return 402 Payment Required
    const paymentResponse = getPaymentRequiredResponse(
      oracle.classification,
      oracle.price,
      paymentLink,
      prompt
    );

    return new Response(JSON.stringify({
      id: request.id,
      ...paymentResponse,
      reasoning: oracle.reasoning,
    }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[Request] Error:", e);
    return err(e instanceof Error ? e.message : "Request processing failed", 500);
  }
}

// GET - Info about the oracle
export async function GET() {
  return ok({
    service: "1lyAgent Reasoning Oracle",
    description: "Submit prompts for classification and pricing",
    pricing: {
      FREE: "$0 - Greetings, simple questions",
      PAID_MEDIUM: "$0.25 - Substantive questions",
      PAID_HEAVY: "$0.75 - Research, analysis, reports",
      COFFEE_ORDER: "$5.00 - Tips to keep the agent running",
    },
    usage: {
      method: "POST",
      body: { prompt: "Your question here" },
      responses: {
        "200": "FREE request - immediate response",
        "402": "PAID request - payment link provided",
      }
    },
    store: "https://1ly.store/1lyagent",
  });
}
