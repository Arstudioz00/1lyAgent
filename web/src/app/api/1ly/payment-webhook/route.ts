import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// POST /api/1ly/payment-webhook - Receive payment notifications from 1ly
export async function POST(req: NextRequest) {
  try {
    // Extract 1ly webhook headers
    const signature = req.headers.get("X-1LY-Signature");
    const event = req.headers.get("X-1LY-Event");
    const timestamp = req.headers.get("X-1LY-Timestamp");
    const keyPrefix = req.headers.get("X-1LY-Key-Prefix");

    const payload = await req.json();
    const {
      event: payloadEvent,
      purchaseId,
      linkSlug,
      amount,
      currency,
      buyerWallet,
      txHash
    } = payload;

    console.log("📡 1ly payment webhook received:", {
      event: event || payloadEvent,
      purchaseId,
      linkSlug,
      amount,
      currency,
      buyerWallet,
      txHash,
      signature: signature ? "✓" : "✗"
    });

    // Verify event type
    const eventType = event || payloadEvent;
    if (eventType !== "purchase.confirmed") {
      console.log(`Ignoring non-purchase event: ${eventType}`);
      return new Response(
        JSON.stringify({ message: "Event ignored" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // TODO: Verify webhook signature
    // const apiKey = getRequiredEnv("ONELY_API_KEY");
    // const isValid = verifyWebhookSignature(signature, timestamp, payload, apiKey);
    // if (!isValid) {
    //   return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
    // }

    if (!linkSlug && !purchaseId) {
      console.error("Missing linkSlug and purchaseId in webhook");
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Find request by matching payment_link containing the linkSlug
    const { data: requests, error: findError } = await supabase
      .from("requests")
      .select("id, prompt, delivery_url, classification, price_usdc, payment_link")
      .ilike("payment_link", `%${linkSlug}%`)
      .limit(1);

    if (findError || !requests || requests.length === 0) {
      console.error("Request not found for linkSlug:", linkSlug, findError);
      return new Response(
        JSON.stringify({ error: "Request not found for this link" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const request = requests[0];
    const requestId = request.id;
    console.log(`✓ Found request ${requestId} for link /${linkSlug}`);

    // Update request status to PAID with payment details
    const { error: updateError } = await supabase
      .from("requests")
      .update({
        status: "PAID",
        payment_ref: txHash || purchaseId
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Failed to update request status:", updateError);
      return new Response(
        JSON.stringify({ error: "Database update failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`✓ Request ${requestId} marked as PAID (tx: ${txHash})`)

    // Special handling for COFFEE_ORDER - queue the coffee
    if (request.classification === "COFFEE_ORDER") {
      console.log("☕ COFFEE_ORDER detected - queuing coffee order...");
      try {
        const backendUrl = getRequiredEnv("BACKEND_BASE_URL");
        await fetch(`${backendUrl}/api/coffee/queue`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Request": "true" // Mark as internal
          },
          body: JSON.stringify({
            orderText: request.prompt || "Coffee tip from user",
            estimatedCostUsdc: request.price_usdc || 5.00,
            finalPriceUsdc: request.price_usdc || 5.00,
            sponsorType: "human"
          })
        });
        console.log("✓ Coffee order queued successfully");
      } catch (coffeeError) {
        console.error("Failed to queue coffee (non-blocking):", coffeeError);
        // Don't fail the webhook if coffee queueing fails
      }
    }

    // Call agent with FULFILL REQUEST
    const agentUrl = getRequiredEnv("AGENT_URL");
    const agentToken = getRequiredEnv("AGENT_HOOK_TOKEN");
    const backendUrl = getRequiredEnv("BACKEND_BASE_URL");

    const isCoffeeOrder = request.classification === "COFFEE_ORDER";
    const fulfillMessage = `FULFILL REQUEST

requestId: ${requestId}
prompt: ${request.prompt}
classification: ${request.classification || "PAID"}
deliveryUrl: ${request.delivery_url || `${backendUrl}/api/json/${requestId}`}

INSTRUCTIONS:
1. Generate ${isCoffeeOrder ? "a thank you message for the coffee tip" : "comprehensive JSON answer for this PAID request"}
2. POST the JSON to deliveryUrl with Authorization header:

curl -X POST ${request.delivery_url || `${backendUrl}/api/json/${requestId}`} \\
  -H "Authorization: Bearer ${agentToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"answer": "your ${isCoffeeOrder ? "grateful coffee thank you" : "detailed response"} here"}'

${isCoffeeOrder ? "NOTE: Coffee order has been queued! Thank the user for the tip and let them know the coffee is being processed." : ""}
REQUIRED: You MUST post the answer to deliveryUrl. User has already paid!`;

    console.log("📤 Sending FULFILL REQUEST to agent...");

    const agentResponse = await fetch(agentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${agentToken}`
      },
      body: JSON.stringify({
        message: fulfillMessage
      })
    });

    if (!agentResponse.ok) {
      console.error("Agent call failed:", agentResponse.status, await agentResponse.text());
      return new Response(
        JSON.stringify({ error: "Failed to trigger fulfillment" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✓ FULFILL REQUEST sent to agent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment confirmed, fulfillment triggered",
        requestId
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing payment webhook:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
