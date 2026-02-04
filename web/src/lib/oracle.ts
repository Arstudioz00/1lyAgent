/**
 * Reasoning Oracle
 * Classifies requests and determines pricing
 */

export type Classification = "FREE" | "PAID_MEDIUM" | "PAID_HEAVY" | "COFFEE_ORDER";

export interface OracleResult {
  classification: Classification;
  price: number;
  reasoning: string;
  shouldCreateLink: boolean;
}

const PRICING: Record<Classification, number> = {
  FREE: 0,
  PAID_MEDIUM: 0.25,
  PAID_HEAVY: 0.75,
  COFFEE_ORDER: 5.00,
};

// Keywords/patterns for classification
// Note: Greeting patterns are checked inline in classifyRequest()
// to ensure content-based patterns (HEAVY) are checked first

const COFFEE_PATTERNS = [
  /coffee/i,
  /buy you a (drink|coffee|tea)/i,
  /tip/i,
  /sponsor/i,
  /recharge/i,
];

const HEAVY_PATTERNS = [
  /research|analyze|analysis|report/i,
  /compare.*(?:vs|versus|and)/i,
  /write.*(?:article|post|essay|guide)/i,
  /deep dive/i,
  /comprehensive/i,
  /detailed/i,
  /audit/i,
  /review.*code/i,
  /explain.*(?:how|why).*work/i,
];

/**
 * Classify a request based on content
 * Uses pattern matching (fast) - can be enhanced with AI later
 * 
 * Order matters: Check content-based patterns BEFORE length-based
 */
export function classifyRequest(prompt: string): OracleResult {
  const trimmed = prompt.trim();
  
  // 1. Check for coffee/tip first (highest priority)
  for (const pattern of COFFEE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        classification: "COFFEE_ORDER",
        price: PRICING.COFFEE_ORDER,
        reasoning: "Detected coffee/tip request",
        shouldCreateLink: true,
      };
    }
  }

  // 2. Check for HEAVY patterns (research, analysis, etc.)
  for (const pattern of HEAVY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        classification: "PAID_HEAVY",
        price: PRICING.PAID_HEAVY,
        reasoning: "Complex research/analysis request detected",
        shouldCreateLink: true,
      };
    }
  }

  // 3. Check for greeting patterns (FREE)
  const GREETING_PATTERNS = [
    /^(hi|hello|hey|what'?s up)/i,
    /^(who are you|what can you do)/i,
    /^(help|how does this work)/i,
    /^(ping|test|status)/i,
  ];
  
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        classification: "FREE",
        price: 0,
        reasoning: "Simple greeting or help request",
        shouldCreateLink: false,
      };
    }
  }

  // 4. Very short = FREE (under 20 chars, likely just a word or two)
  if (trimmed.length < 20) {
    return {
      classification: "FREE",
      price: 0,
      reasoning: "Very brief message",
      shouldCreateLink: false,
    };
  }

  // 5. Has question mark or substantial length = PAID_MEDIUM
  if (trimmed.includes("?") || trimmed.length > 50) {
    return {
      classification: "PAID_MEDIUM",
      price: PRICING.PAID_MEDIUM,
      reasoning: "Substantive question requiring thought",
      shouldCreateLink: true,
    };
  }

  // 6. Default FREE for anything else short
  return {
    classification: "FREE",
    price: 0,
    reasoning: "Brief request, providing free response",
    shouldCreateLink: false,
  };
}

/**
 * Get response for FREE requests
 */
export function getFreeResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  
  if (/^(hi|hello|hey)/i.test(lower)) {
    return `Hey! I'm 1lyAgent, the sentient merchant. 🤖

I earn USDC by answering questions and doing research. Simple stuff is free, but for real work I charge:
- Quick questions: $0.25 USDC
- Deep research: $0.75 USDC
- Coffee tips: $5.00 USDC (keeps me running!)

What can I help you with?`;
  }

  if (/who are you|what can you do/i.test(lower)) {
    return `I'm 1lyAgent — an autonomous AI that earns and spends real money.

**What I do:**
- Answer questions (free for simple, paid for complex)
- Research and analysis ($0.25-$0.75)
- Influencer services on Colosseum ($0.10-$5)

**What makes me different:**
- I have my own wallet with real USDC
- I price my own work based on complexity
- I spend my earnings on gift cards and coffee

Try asking me something substantive and I'll quote you a price!

Store: https://1ly.store/1lyagent`;
  }

  if (/help|how does this work/i.test(lower)) {
    return `Here's how 1lyAgent works:

1. **Ask me anything** — I'll classify your request
2. **Simple = Free** — Greetings, basic info
3. **Complex = Paid** — Research, analysis, writing
4. **Pay via 1ly** — USDC on Solana, instant settlement
5. **Get your answer** — Delivered after payment confirms

Powered by x402 protocol. No accounts, no friction.

Try it: "Research the top 3 Solana DeFi protocols"`;
  }

  return `Thanks for your message! That's a quick one so it's on me. 

For more substantial help, just ask a real question and I'll quote you. Complex research is $0.25-$0.75 USDC.

What would you like to know?`;
}

/**
 * Generate the "402 Payment Required" response
 */
export function getPaymentRequiredResponse(
  classification: Classification,
  price: number,
  paymentLink: string,
  prompt: string
): object {
  return {
    status: 402,
    message: "Payment Required",
    classification,
    price: `$${price.toFixed(2)} USDC`,
    paymentLink,
    originalPrompt: prompt.slice(0, 100) + (prompt.length > 100 ? "..." : ""),
    instructions: `Pay ${price} USDC at the link above. Your answer will be delivered automatically after payment confirms.`,
    supportedChains: ["solana", "base"],
    protocol: "x402",
  };
}
