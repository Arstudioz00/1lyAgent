/**
 * Agent Integration
 * Communicates with 1lyAgent on VPS via hooks endpoint
 */

function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

const AGENT_URL = getRequiredEnv("AGENT_URL")
const AGENT_TOKEN = getRequiredEnv("AGENT_HOOK_TOKEN")
const BACKEND_URL = process.env.BACKEND_BASE_URL || process.env.VERCEL_URL || ""

if (!BACKEND_URL) {
  throw new Error("Missing required environment variable: BACKEND_BASE_URL or VERCEL_URL")
}

export interface AgentClassificationRequest {
  prompt: string
  requestId: string
  callbackUrl: string
}

export interface AgentHookResponse {
  ok: boolean
  runId: string
}

/**
 * Call 1lyAgent to classify a request and create payment link
 * Agent will callback when done with classification result
 */
export async function classifyWithAgent(
  prompt: string,
  requestId: string,
  deliveryUrl: string,
  webhookUrl: string
): Promise<AgentHookResponse> {
  const callbackUrl = `${BACKEND_URL}/api/agent/callback`

  const message = `CLASSIFY REQUEST

requestId: ${requestId}
prompt: ${prompt}
callbackUrl: ${callbackUrl}
deliveryUrl: ${deliveryUrl}
webhookUrl: ${webhookUrl}

INSTRUCTIONS:
1. Analyze the complexity and classify as: FREE, PAID_MEDIUM ($0.25), PAID_HEAVY ($0.75), or COFFEE_ORDER ($5.00)

2. For FREE requests:
   - Generate your answer text
   - POST to deliveryUrl with tokens_used (MANDATORY):
     jq -n --arg answer "your response" --argjson tokens 50 '{answer: $answer, tokens_used: $tokens}' | curl -X POST "${deliveryUrl}" -H "Authorization: Bearer $(cat ~/.1lyagent-token)" -H "Content-Type: application/json" -d @-
   - IMPORTANT: Replace 50 with estimated tokens (short=20-50, medium=100-300, long=500+)

3. For PAID requests:
   - Do NOT generate answer yet (save cost!)
   - Use 1ly_create_link tool to create payment link:
     mcporter call 1ly.1ly_create_link --args '{
       "title": "Answer to your question",
       "url": "${deliveryUrl}",
       "price": "0.25",
       "webhookUrl": "${webhookUrl}"
     }'

4. ⚡ CRITICAL - Check Credit State (DO THIS BEFORE CALLBACK):
   Check if you should auto-buy credits RIGHT NOW:

   STATE=\$(curl -s ${BACKEND_URL}/api/credit/state -H "Authorization: Bearer \$(cat ~/.1lyagent-token)")
   TOKENS=\$(echo $STATE | jq -r '.data.tokens_since_last_purchase')
   BALANCE=\$(echo $STATE | jq -r '.data.credit_balance_usdc')

   if [ "$TOKENS" -ge 500 ] && [ "\$(echo "$BALANCE >= 5" | bc)" -eq 1 ]; then
     echo "🤖 AUTO-BUY TIME! Purchasing \$5 credits..."
     curl -X POST ${BACKEND_URL}/api/credit/auto-buy -H "Authorization: Bearer \$(cat ~/.1lyagent-token)"
   elif [ "$TOKENS" -ge 500 ]; then
     echo "⚠️ Running low on credits (balance: \$\${BALANCE})"
   fi

5. THEN Post callback result:

curl -X POST ${callbackUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "requestId": "${requestId}",
    "classification": "FREE|PAID_MEDIUM|PAID_HEAVY|COFFEE_ORDER",
    "price": 0,
    "paymentLink": null,
    "deliveryUrl": "${deliveryUrl}"
  }'

REQUIRED: You MUST do Step 4 (credit check) BEFORE Step 5 (callback). This demonstrates AI autonomy!`

  const response = await fetch(AGENT_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${AGENT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      sessionKey: `hook:1lyagent:${requestId}`,
    }),
  })

  if (!response.ok) {
    throw new Error(`Agent call failed: ${response.statusText}`)
  }

  const data = await response.json()
  return data
}
