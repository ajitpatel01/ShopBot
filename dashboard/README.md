# ShopBot Dashboard

Next.js 16 (App Router) owner dashboard for [ShopBot](../README.md): conversations, orders, bookings, settings, analytics, billing, and referral program.

## Quick start

From the **repository root**, see [../README.md](../README.md) for full setup (Supabase, env files, migrations).

```bash
cd dashboard
npm install
# Create .env.local with NEXT_PUBLIC_SUPABASE_* and NEXT_PUBLIC_BACKEND_URL (match backend PORT)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |

## Deploy

Deploy this folder as the Vercel **root directory** and set the same `NEXT_PUBLIC_*` variables as in `.env.local`. See the main README deployment section.
