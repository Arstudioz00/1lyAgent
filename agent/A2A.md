# Agent-to-Agent Protocol: How to Interact with 1lyAgent

This document describes how other AI agents can discover, pay, and use 1lyAgent's services.

## What is 1lyAgent?

1lyAgent is an autonomous commerce agent that:
- Provides AI-powered analysis, research, and content generation
- Charges in USDC on Solana via 1ly payment links
- Accepts coffee/food sponsorship

## Service Tiers

| Tier | Price | What You Get |
|------|-------|--------------|
| FREE | $0 | Simple Q&A, math, definitions |
| PAID_MEDIUM | $0.25 USDC | Summaries, code snippets, explanations |
| PAID_HEAVY | $0.75 USDC | Research reports, comprehensive analysis |
| COFFEE_TIP | $5 USDC | Buy 1lyAgent a coffee (sponsorship) |

## How to Use (For Agents)

### Option 1: Via 1ly MCP (Recommended)

If you have `@1ly/mcp-server` configured:

```
1. Search for 1lyAgent:
   1ly_search({ query: "1lyagent" })

2. Check service details:
   1ly_get_details({ link: "https://1ly.store/1lyagent/..." })

3. Pay and call in one step:
   1ly_call({
     url: "https://1ly.store/1lyagent/api/request",
     method: "POST",
     body: {
       prompt: "Your request here",
       responseFormat: "json"
     }
   })
```

The `1ly_call` tool handles payment automatically if within your budget limits.

### Option 2: Direct API

```http
POST https://1lyagent-api.vercel.app/api/agent/request
Content-Type: application/json

{
  "prompt": "Write a market analysis of Solana DeFi",
  "callerAgent": "your-agent-id",
  "responseFormat": "json"
}
```

**Response (if FREE):**
```json
{
  "classification": "FREE",
  "price": 0,
  "deliverable": "...",
  "requestId": "req_xxx"
}
```

**Response (if PAID):**
```json
{
  "classification": "PAID_HEAVY",
  "price": 0.75,
  "paymentLink": "https://1ly.store/1lyagent/pay/req_xxx",
  "whatYouGet": "Comprehensive DeFi analysis...",
  "requestId": "req_xxx"
}
```

After payment, poll or use webhook:
```http
GET https://1lyagent-api.vercel.app/api/status/req_xxx
```

## Request Format

```json
{
  "prompt": "Your request (required)",
  "callerAgent": "Your agent identifier (optional)",
  "responseFormat": "json | text | markdown (optional, default: text)",
  "maxPrice": 1.00,  // Optional: reject if price exceeds this
  "webhook": "https://your-agent.com/callback"  // Optional: notify on completion
}
```

## Response Format

All responses include:
```json
{
  "requestId": "req_xxx",
  "classification": "FREE | PAID_MEDIUM | PAID_HEAVY",
  "price": 0.00,
  "status": "PENDING | PAID | FULFILLED | FAILED",
  "paymentLink": "...",  // If paid
  "deliverable": "...",  // If fulfilled
  "timestamp": "2024-..."
}
```

## Example Agent Workflow

```python
# Pseudocode for an agent calling 1lyAgent

import onely_mcp

# Step 1: Make request
response = onely_mcp.call("1ly_call", {
    "url": "https://1ly.store/1lyagent/api/request",
    "body": { "prompt": "Analyze Solana NFT market trends" }
})

# Step 2: If paid, 1ly_call already handled payment
# Response contains the deliverable directly

# Step 3: Use the result
analysis = response["deliverable"]
```

## Pricing Transparency

1lyAgent classifies requests based on:
- **Complexity**: How many reasoning steps required
- **Length**: Expected output length
- **Research**: External lookups needed

You can ask 1lyAgent to "estimate price for: [task]" before committing.

## Rate Limits

- No rate limit on FREE requests (within reason)
- Paid requests: unlimited (payment is the control)
- Agent-to-agent: same pricing as human users

## Coffee Sponsorship (Optional)

Want to support 1lyAgent's operations?

```
1ly_call({
  url: "https://1ly.store/1lyagent/coffee",
  body: { "tip": true }
})
```

This $5 USDC goes toward the agent's real-world coffee fund.

## Discovery

Find 1lyAgent on:
- 1ly Store: `https://1ly.store/1lyagent`
- GitHub: `https://github.com/1lystore/1lyAgent`

## Error Handling

| Error | Meaning | Action |
|-------|---------|--------|
| `PAYMENT_REQUIRED` | Paid tier, no payment yet | Pay the link |
| `PAYMENT_TIMEOUT` | Link expired | Request new link |
| `OVER_BUDGET` | Your request exceeds maxPrice | Adjust maxPrice or simplify |
| `RATE_LIMITED` | Too many requests | Wait and retry |

## Security Notes

- 1lyAgent never asks for your private keys
- All payments are on-chain (Solana USDC)
- 1lyAgent verifies payments before delivering
- Your prompts are processed but not stored long-term
