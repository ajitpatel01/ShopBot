# 💬 ShopBot

### WhatsApp AI Assistant for Local Businesses in India

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Groq AI](https://img.shields.io/badge/Groq-Llama%203.3%2070B-F55036?logo=meta&logoColor=white)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Turn every WhatsApp message into a business opportunity — 24/7, fully automated, zero technical setup.**

**Repository:** [github.com/ajitpatel01/ShopBot](https://github.com/ajitpatel01/ShopBot)

**Live dashboard (production):** [shop-gq05gay41-ajitpatel01s-projects.vercel.app](https://shop-gq05gay41-ajitpatel01s-projects.vercel.app)

---

## 📚 Documentation

| Doc | Description |
|-----|-------------|
| This README | Setup, env vars, architecture, workflows |
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | Production deploy checklist (Railway, Vercel, Supabase, Razorpay) |
| [dashboard/README.md](dashboard/README.md) | Dashboard app: scripts and local dev |
| **Production dashboard** | [https://shop-gq05gay41-ajitpatel01s-projects.vercel.app](https://shop-gq05gay41-ajitpatel01s-projects.vercel.app) (Vercel) |

---

## 🚀 What is ShopBot?

Local businesses in India lose **40%+ of customer enquiries** because no one is available to reply on WhatsApp after hours, during busy periods, or on holidays. ShopBot connects to any business WhatsApp number and acts as an always-on AI employee — answering questions, taking orders, booking appointments, collecting payments, and notifying the owner instantly. It works seamlessly in **Hindi, English, and Hinglish**, costs less than a cup of chai per day, and requires absolutely zero technical knowledge to set up.

---

## ✨ Features

### For Customers

- Natural WhatsApp conversations in Hindi, English, or Hinglish
- Instant replies to product, price, hours, and location questions
- Order placement and booking through conversation
- Automatic order confirmation messages
- **UPI / Card / NetBanking payment** directly in WhatsApp via Razorpay payment links
- **Real-time order tracking** — text "where is my order?" for instant status updates
- **Public shop page** with menu, hours, and one-tap WhatsApp chat button

### For Shop Owners

- Zero technical setup — bot goes live in minutes
- Real-time dashboard for conversations, orders, and bookings
- Instant WhatsApp notification on every new order
- Daily morning digest delivered at 7:50am IST
- Proactive customer engagement (morning greetings, evening offers, re-engagement)
- Edit shop profile, menu, hours, and bot behaviour anytime
- **Payment status tracking** — see paid / awaiting / COD per order
- **Abandoned order recovery** — automatic follow-up messages for incomplete orders
- **Refer & Earn** — earn free months by referring other shop owners
- **Public shop landing page** — SEO-friendly page with menu and WhatsApp CTA
- Customer review collection after completed orders

### AI Capabilities

- Multi-turn conversation memory (last 10 messages)
- Intent detection: FAQ / order / booking / complaint / escalation
- Dynamic per-shop system prompts with full business context
- Festival-aware and time-aware greetings (Good morning, Happy Diwali, etc.)
- Graceful escalation to owner when the AI is unsure
- **Token-saving keyword interception** — tracking and payment queries skip the AI entirely
- Powered by **Llama 3.3 70B** via Groq API (sub-second inference)

---

## 🏗️ System Architecture

```
Customer (WhatsApp)
       ↓
WhatsApp Layer (whatsapp-web.js → Meta Cloud API)
       ↓
Backend API (Node.js + Express)
   ├── Groq AI (Llama 3.3 70B)
   ├── Razorpay (Subscriptions + UPI Payment Links)
   ├── Supabase PostgreSQL
   ├── Scheduled Jobs (digests, proactive messages, abandoned order recovery)
   └── Owner WhatsApp Notifications
       ↓
Owner Dashboard (Next.js 16 on Vercel)
       ↓
Public Shop Pages (SSR, SEO-optimized, no auth required)
```

---

## 🛠️ Tech Stack

### Backend

| Technology | Role | Hosting |
|---|---|---|
| Node.js + Express | API server, webhook handler | Railway |
| whatsapp-web.js | WhatsApp integration (MVP) | Same process |
| Groq API (Llama 3.3 70B) | AI inference (<500ms) | Groq Cloud |
| node-cron | Scheduled jobs (digests, proactive messages, abandoned order recovery) | Same process |

### Frontend

| Technology | Role | Hosting |
|---|---|---|
| Next.js 16 (App Router) | Owner dashboard + public shop pages | Vercel |
| React 19 | UI rendering | — |
| Tailwind CSS v4 | Styling (Viper dark theme) | — |
| Framer Motion | Page transitions and animations | — |
| Recharts | Analytics charts | — |
| Radix UI | Accessible UI primitives | — |

### Database & Auth

| Technology | Role | Free Tier |
|---|---|---|
| Supabase PostgreSQL | Main database with RLS | 500MB free |
| Supabase Auth | Owner login (email + Google) | 50k MAU free |
| Supabase Realtime | Live dashboard updates | Included |

### Supporting Services

| Service | Role |
|---|---|
| Razorpay | Subscription billing + UPI/card payment links for orders |
| Resend | Transactional emails |

---

## 💰 Pricing Plans

| Plan | Price | Shops | Conversations |
|---|---|---|---|
| **Starter** | ₹499/month | 1 | 500/month |
| **Growth** | ₹1,299/month | 1 | Unlimited |
| **Multi-shop** | ₹2,999/month | Up to 5 | Unlimited |
| **Enterprise** | Custom | Unlimited | Unlimited |

All plans include a **14-day free trial** on the Growth plan. Referred users get an **extended 28-day trial**.

### Refer & Earn Program

Shop owners can share a unique referral code. When a referred business subscribes, the referrer earns **1 free month** added to their account. No limits on how many free months can be earned.

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `shops` | Business profiles — name, type, menu, hours, FAQs, plan, subscription status, slug |
| `conversations` | One row per unique customer per shop, tracks message count and resolution state |
| `messages` | Every inbound and outbound message (`body`, `direction`, `intent`, etc.) |
| `orders` | Captured orders with JSONB items, total, status, payment status, customer notes |
| `bookings` | Appointments with datetime, service, customer name, status |
| `digests` | Daily summary records per shop (messages, orders, bookings, revenue) |
| `referral_codes` | Unique referral codes per shop, usage tracking |
| `referral_redemptions` | Tracks who referred whom, reward status |
| `order_intents` | Abandoned order tracking (`intent_data`, `status`, `follow_up_at`, `follow_up_sent`, etc.) |
| `auth.users` | Owner accounts — managed by Supabase Auth |

Row Level Security is enabled on all tables. Owners can only access their own shop data.

### Migrations

Run these in order in the Supabase SQL Editor:

1. `backend/src/db/schema.sql` — Core tables
2. `backend/src/db/migrations/001_add_conversation_fields.sql` — Conversation enhancements
3. `backend/src/db/migrations/002_referral_system.sql` — Referral codes and redemptions
4. `backend/src/db/migrations/003_abandoned_orders.sql` — Order intent tracking
5. `backend/src/db/migrations/004_shop_slug.sql` — Public shop page slugs

---

## 📁 Project Structure

```
ShopBot/
├── backend/                           # Node.js API + WhatsApp bot
│   ├── src/
│   │   ├── config/                    # Plan definitions, festivals, proactive messages
│   │   ├── db/
│   │   │   ├── schema.sql             # Core database schema
│   │   │   └── migrations/            # Incremental schema changes
│   │   │       ├── 001_add_conversation_fields.sql
│   │   │       ├── 002_referral_system.sql
│   │   │       ├── 003_abandoned_orders.sql
│   │   │       └── 004_shop_slug.sql
│   │   ├── middleware/                # Auth, rate limiting, plan checks, error handling
│   │   ├── routes/
│   │   │   ├── webhook.js             # Core WhatsApp message processing loop
│   │   │   ├── shops.js               # Shop CRUD
│   │   │   ├── conversations.js       # Conversation + message APIs
│   │   │   ├── orders.js              # Orders + bookings APIs
│   │   │   ├── billing.js             # Subscription management
│   │   │   ├── payments.js            # Razorpay payment link webhooks + callbacks
│   │   │   ├── referral.js            # Refer & Earn API
│   │   │   └── public.js              # Public shop data (no auth)
│   │   └── services/
│   │       ├── whatsapp.js            # WhatsApp client management
│   │       ├── groq.js                # AI inference via Groq
│   │       ├── promptBuilder.js       # Dynamic system prompt generation
│   │       ├── intentProcessor.js     # Post-reply intent routing
│   │       ├── extractors.js          # Order/booking extraction from messages
│   │       ├── orderService.js        # Order/booking CRUD
│   │       ├── conversationService.js # Conversation persistence
│   │       ├── shopService.js         # Shop lookups with caching
│   │       ├── notificationService.js # Owner WhatsApp notifications
│   │       ├── billingService.js      # Razorpay subscription management
│   │       ├── paymentService.js      # UPI payment link generation
│   │       ├── orderTrackingService.js# Real-time order status for customers
│   │       ├── referralService.js     # Refer & Earn logic
│   │       ├── abandonedOrderService.js# Cart abandonment recovery
│   │       ├── digestService.js       # Daily digest generation
│   │       ├── proactiveService.js    # Proactive customer engagement
│   │       └── supabase.js            # Database client initialization
│   ├── scripts/                       # Seed and test scripts
│   └── index.js                       # Entry point
├── dashboard/                         # Next.js owner dashboard
│   ├── app/
│   │   ├── layout.tsx                 # Root layout (Inter font, Sonner toaster)
│   │   ├── login/page.tsx             # Login page
│   │   ├── auth/callback/route.ts     # Supabase OAuth callback
│   │   ├── shop/[slug]/               # Public shop landing page (no auth)
│   │   │   ├── page.tsx               # Server component with SEO metadata
│   │   │   └── client.tsx             # Client component with menu, hours, FAQs
│   │   └── dashboard/
│   │       ├── layout.tsx             # Sidebar navigation
│   │       ├── page.tsx               # Overview / home
│   │       ├── conversations/         # Conversation list + detail + customer profile
│   │       ├── orders/page.tsx        # Orders with payment status + tracking
│   │       ├── bookings/page.tsx      # Booking management
│   │       ├── settings/page.tsx      # Shop settings + public page link
│   │       ├── analytics/page.tsx     # Revenue, peak hours, top items, customers
│   │       ├── billing/page.tsx       # Plan management
│   │       └── referral/page.tsx      # Refer & Earn dashboard
│   ├── components/                    # Shared UI components
│   ├── lib/                           # Supabase + API clients
│   └── middleware.ts                  # Auth guard for /dashboard routes
├── LAUNCH_CHECKLIST.md
└── README.md
```

---

## ⚡ Getting Started

### Prerequisites

- Node.js 18+
- npm
- A WhatsApp number (dedicated SIM recommended)
- A [Supabase](https://supabase.com) account (free tier works)
- A [Groq](https://console.groq.com) API key (free tier works)
- A [Razorpay](https://razorpay.com) account (for payment collection)

### 1. Clone the repository

```bash
git clone https://github.com/ajitpatel01/ShopBot.git
cd ShopBot
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in all values in .env (see Environment Variables below)
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run the files in order:
   - `backend/src/db/schema.sql`
   - `backend/src/db/migrations/001_add_conversation_fields.sql`
   - `backend/src/db/migrations/002_referral_system.sql`
   - `backend/src/db/migrations/003_abandoned_orders.sql`
   - `backend/src/db/migrations/004_shop_slug.sql`
3. Copy your project URL, anon key, and service role key into `.env`

### 4. Set up the dashboard

```bash
cd ../dashboard
npm install
# Create dashboard/.env.local (not committed to git) with:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#   NEXT_PUBLIC_BACKEND_URL (must match backend PORT), NEXT_PUBLIC_APP_URL
```

### 5. Run locally

**Important:** `NEXT_PUBLIC_BACKEND_URL` in `dashboard/.env.local` must match the URL the backend actually listens on (same host and port as `PORT` in `backend/.env`, default **3001**). If they differ, the dashboard will load but show no shops until the API is reachable.

```bash
# Terminal 1 — Backend
cd backend && npm run dev   # or: node index.js
# Scan the QR code with WhatsApp when it appears
# Expected startup logs:
#   ShopBot backend running on port <PORT>
#   [App] WhatsApp client initializing...
#   [App] Daily digest scheduled for 07:50 IST
#   [App] Proactive messages scheduled
#   [App] Abandoned order recovery: every 30 minutes

# Terminal 2 — Dashboard
cd dashboard && npm run dev
```

### 6. Open the dashboard

- **Production:** [https://shop-gq05gay41-ajitpatel01s-projects.vercel.app](https://shop-gq05gay41-ajitpatel01s-projects.vercel.app)
- **Local dev:** [http://localhost:3000](http://localhost:3000)

### 7. Test public shop page

Visit `http://localhost:3000/shop/your-shop-slug` (no login required)

---

## 🔑 Environment Variables

### Backend (`/backend/.env`)

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | API key from [console.groq.com](https://console.groq.com) |
| `SUPABASE_URL` | Project URL from Supabase Settings > API |
| `SUPABASE_ANON_KEY` | Anon/public key from Supabase Settings > API |
| `SUPABASE_SERVICE_KEY` | Service role key — never expose to frontend |
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
| `RAZORPAY_KEY_ID` | Key ID from Razorpay Settings > API Keys |
| `RAZORPAY_SECRET` | Key secret from Razorpay |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook secret configured in Razorpay dashboard |
| `RAZORPAY_PLAN_STARTER` | Razorpay Plan ID for Starter plan |
| `RAZORPAY_PLAN_GROWTH` | Razorpay Plan ID for Growth plan |
| `RAZORPAY_PLAN_MULTISHOP` | Razorpay Plan ID for Multi-shop plan |
| `PORT` | Backend port (default: `3001`) |
| `NODE_ENV` | `development` or `production` |
| `DASHBOARD_URL` | Dashboard URL (default: `http://localhost:3000`) |
| `BACKEND_URL` | Backend URL (default: `http://localhost:3001`) |

### Dashboard (`/dashboard/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same Supabase anon key |
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL — **must match** `PORT` (e.g. `http://localhost:3001` or `http://localhost:3003`) |
| `NEXT_PUBLIC_APP_URL` | Dashboard URL (default: `http://localhost:3000`) |

---

## 🔧 Troubleshooting (local)

| Symptom | What to check |
|--------|----------------|
| Dashboard opens but **no shops / empty data** | Backend running; `NEXT_PUBLIC_BACKEND_URL` port = `PORT` in backend `.env`; browser devtools **Network** tab for failed `/shops` requests. |
| **401** on API calls | Sign out and sign in again so the Supabase session token is attached to requests. |
| WhatsApp **@lid** (linked device) send issues | Outbound replies resolve the chat via `getChats()` when the id contains `@lid`, with `@c.us` fallback. |

---

## 🚀 Deployment

### Backend → Railway

1. Push code to GitHub
2. Create a new project at [railway.app](https://railway.app) and connect your repo
3. Set root directory to `/backend`
4. Add all environment variables from `.env.example`
5. Deploy — Railway auto-detects Node.js and runs `npm start`

### Dashboard → Vercel

1. Create a new project at [vercel.com](https://vercel.com) and connect your repo
2. Set root directory to `/dashboard`
3. Add all `NEXT_PUBLIC_*` environment variables
4. Deploy — Vercel auto-detects Next.js

**Current production URL:** [https://shop-gq05gay41-ajitpatel01s-projects.vercel.app](https://shop-gq05gay41-ajitpatel01s-projects.vercel.app)

### Razorpay Setup

1. Create a Razorpay account and get test/live API keys
2. Configure a webhook endpoint at `https://your-backend.com/payments/webhook`
3. Set the webhook secret in your `.env` as `RAZORPAY_WEBHOOK_SECRET`
4. Enable `payment_link.paid` event in the Razorpay webhook settings

---

## 📊 Core Workflows

### Customer Message Flow (< 2 seconds)

```
1. Customer sends WhatsApp message
2. Backend receives via event listener
3. Shop profile loaded from cache (60s TTL)
4. Keyword interception check (tracking, payment queries → instant reply, skip AI)
5. Last 10 messages fetched for conversation context
6. Groq AI generates reply + detects intent
7. Reply sent to customer FIRST (speed priority)
8. Message saved to Supabase
9. If order/booking detected → extract, save, notify owner via WhatsApp
10. If order created on paid plan → send Razorpay payment link after 1s delay
11. If order intent but no extraction → record for abandoned order recovery
```

### UPI Payment Collection

```
1. Customer confirms order via WhatsApp
2. Bot sends Razorpay payment link (UPI / Card / NetBanking)
3. Customer pays without leaving WhatsApp
4. Razorpay webhook confirms payment
5. Bot sends payment confirmation to customer
6. Dashboard shows "Paid ✓" badge on the order
```

### Order Tracking

```
1. Customer texts "where is my order?" / "track my order" / "order kahan hai"
2. Keywords intercepted before AI call (saves tokens)
3. Active orders queried (last 24h, non-completed/cancelled)
4. Status sent instantly with emoji indicators and ETA
```

### Owner Order Confirmation

```
1. Owner receives WhatsApp notification with order details
2. Owner replies CONFIRM ORD-xxx or CANCEL ORD-xxx
3. Backend updates order status
4. Customer receives confirmation/cancellation message
```

### Abandoned Order Recovery

```
1. Customer shows order intent but doesn't complete
2. Intent recorded in order_intents table
3. After 2 hours, cron job sends a follow-up WhatsApp message
4. If customer places order before follow-up, intent is marked as converted
5. No follow-up sent after 24 hours
```

### Daily Digest (7:50am IST)

```
1. node-cron triggers at 07:50 Asia/Kolkata
2. All active shops fetched, processed in batches of 10
3. Previous day's stats aggregated per shop (messages, orders, bookings, revenue)
4. Summary formatted and sent to owner's WhatsApp
5. Digest record saved to database
```

### Refer & Earn

```
1. Shop owner generates unique referral code from dashboard
2. Shares code with other business owners
3. Referee signs up with code → gets 28-day trial (instead of 14)
4. When referee subscribes → referrer gets 1 free month added
5. WhatsApp notification sent to referrer on reward
```

---

## 🗺️ Roadmap

- [x] ~~Payment collection via WhatsApp~~ (Razorpay UPI/Card/NetBanking)
- [x] ~~Order tracking for customers~~
- [x] ~~Referral program~~
- [x] ~~Abandoned order recovery~~
- [x] ~~Public shop landing pages~~
- [x] ~~Proactive customer engagement~~
- [x] ~~Customer review collection~~
- [ ] Meta Cloud API migration (replace whatsapp-web.js)
- [ ] Multi-language support beyond Hindi/English
- [ ] Inventory management integration
- [ ] Mobile app for shop owners
- [ ] Analytics API for enterprise customers
- [ ] Multi-image menu support
- [ ] Voice message processing

---

## 🤝 Contributing

Contributions are welcome. Please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

Built by **Ajit Patel**

[![GitHub](https://img.shields.io/badge/GitHub-ajitpatel01-181717?logo=github&logoColor=white)](https://github.com/ajitpatel01)

---

<p align="center">
  <strong>ShopBot</strong> — Helping local businesses never miss a customer again.
</p>
