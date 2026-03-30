# Gridlock

Gridlock is a Next.js App Router app for running football squares pools with:

- Pool creation and shareable join links
- Live grid updates through Supabase subscriptions
- Score ingestion and winner resolution routes
- SMS/email winner notifications
- Scheduled score polling via Vercel Cron

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Run tests:

```bash
npm run test:run
```

## Environment Variables

Create `.env.local` from `.env.local.example` and set these values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `FOOTBALL_API_KEY`
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

## Vercel Deployment

Project URL: `https://vercel.com/diamonddavesibs-projects/gridlock_pool`

Recommended project settings:

- Framework preset: `Next.js`
- Build command: `npm run build`
- Install command: `npm install`
- Root directory: repository root

Set all environment variables above in Vercel for the `Production` environment.

This repo includes Vercel cron configuration in `vercel.json`:

- `GET /api/cron/scores` every minute (`* * * * *`)

After saving settings, redeploy from the Vercel Deployments page or by pushing a commit to your production branch.
