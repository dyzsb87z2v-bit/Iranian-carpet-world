export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  telegramBotUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "",
  telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  telegramAdminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
  // Hard switch: payments stay off until the Iran–EU trade path is confirmed legal.
  checkoutEnabled: process.env.CHECKOUT_ENABLED === "true",
};

export const isSupabaseConfigured = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);
