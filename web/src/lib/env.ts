const num = (v: string | undefined, fallback: number): number => {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  demoMode: process.env.DEMO_MODE === "true",
  demoAdminToken: process.env.DEMO_ADMIN_TOKEN ?? "",
  agentSharedSecret: process.env.AGENT_SHARED_SECRET ?? "",
  maxSwiggyExecPerDay: num(process.env.MAX_SWIGGY_EXECUTIONS_PER_DAY, 3),
  coffeeBatchIntervalHours: num(process.env.COFFEE_BATCH_INTERVAL_HOURS, 4),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  ownerTelegramChatId: process.env.OWNER_TELEGRAM_CHAT_ID ?? ""
};
