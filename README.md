# IRAN CARPET WORLD · دنیای فرش ایران

International marketplace for Persian rugs: sellers in Iran list rugs (web or Telegram), buyers in the EU browse with full landed-cost transparency. Payments are **disabled** until the Iran–EU trade and payment route is confirmed legal; buyers send non-binding inquiries.

- Roadmap, architecture and phases (Persian): [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Database schema and RLS: [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · next-intl (en / de / fa with RTL) · Supabase (Postgres, Auth, Storage, RLS) · Telegram Bot API (webhook) · Claude API for listing extraction and translation.

## Run
```bash
npm install
cp .env.example .env.local   # works without values in demo mode
npm run dev                  # http://localhost:3000/en
npm test                     # unit tests
```

## Connect services
1. Create a Supabase project, run `supabase/migrations/0001_init.sql`, fill the Supabase keys in `.env.local`.
2. Sign in once, then make yourself admin: `update profiles set role = 'admin' where id = '<your uuid>';`
3. Telegram: create a bot with BotFather, set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`, then
   `curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=$SITE/api/telegram/webhook&secret_token=$TELEGRAM_WEBHOOK_SECRET"`
4. Optional: `ANTHROPIC_API_KEY` enables AI-written EN/DE listings; without it the bot uses a plain template.

## Seller bot commands
Send photos (or `/new`) to start a listing · `/my` list rugs · `/price 2 90 میلیون` · `/stock 2 0` · `/off 2` · `/cancel`
