import { isTrustedCaller } from "@/lib/auth";
import { env } from "@/lib/env";
import { err, ok } from "@/lib/http";
import { z } from "zod";

const notifySchema = z.object({
  orderId: z.string(),
  orderText: z.string(),
  amount: z.number(),
  paymentRef: z.string().optional()
});

export async function POST(req: Request) {
  try {
    if (!isTrustedCaller(req)) {
      return err("Unauthorized", 401);
    }

    const parsed = notifySchema.safeParse(await req.json());
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Invalid payload");
    }

    const { orderId, orderText, amount, paymentRef } = parsed.data;

    if (!env.telegramBotToken || !env.ownerTelegramChatId) {
      return err("Telegram not configured", 500);
    }

    const message = `☕ *Coffee Order Ready!*

*Order:* ${orderText}
*Amount:* $${amount.toFixed(2)} USDC (paid ✓)
*ID:* \`${orderId}\`
${paymentRef ? `*Ref:* \`${paymentRef}\`` : ""}

Reply "approve" to place order via Swiggy`;

    const telegramUrl = `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.ownerTelegramChatId,
        text: message,
        parse_mode: "Markdown"
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Telegram API error:", error);
      return err("Failed to send Telegram notification", 500);
    }

    return ok({ sent: true, orderId });
  } catch (e) {
    return err(e instanceof Error ? e.message : "Notify failed", 500);
  }
}
