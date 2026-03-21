# 💬 ShopBot

### WhatsApp AI Assistant for Local Businesses in India

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Groq AI](https://img.shields.io/badge/Groq-Llama%203.3%2070B-F55036?logo=meta&logoColor=white)](https://groq.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Turn every WhatsApp message into a business opportunity — 24/7, fully automated, zero technical setup.**

---

## 🚀 What is ShopBot?

Local businesses in India lose **40%+ of customer enquiries** because no one is available to reply on WhatsApp after hours, during busy periods, or on holidays. ShopBot connects to any business WhatsApp number and acts as an always-on AI employee — answering questions, taking orders, booking appointments, and notifying the owner instantly. It works seamlessly in **Hindi, English, and Hinglish**, costs less than a cup of chai per day, and requires absolutely zero technical knowledge to set up.

---

## ✨ Features

### For Customers

- Natural WhatsApp conversations in Hindi, English, or Hinglish
- Instant replies to product, price, hours, and location questions
- Order placement and booking through conversation
- Automatic order confirmation messages

### For Shop Owners

- Zero technical setup — bot goes live in minutes
- Real-time dashboard for conversations, orders, and bookings
- Instant WhatsApp notification on every new order
- Daily morning digest delivered at 7:50am IST
- Edit shop profile, menu, hours, and bot behaviour anytime

### AI Capabilities

- Multi-turn conversation memory (last 10 messages)
- Intent detection: FAQ / order / booking / complaint / escalation
- Dynamic per-shop system prompts with full business context
- Graceful escalation to owner when the AI is unsure
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
   ├── Supabase PostgreSQL
   └── Owner WhatsApp Notifications
       ↓
Owner Dashboard (Next.js 14 on Vercel)
```

---

## 🛠️ Tech Stack

### Backend

| Technology | Role | Hosting |
|---|---|---|
| Node.js + Express | API server, webhook handler | Railway |
| whatsapp-web.js | WhatsApp integration (MVP) | Same process |
| Groq API (Llama 3.3 70B) | AI inference (<500ms) | Groq Cloud |
| node-cron | Daily digest scheduler | Same process |

### Frontend

| Technology | Role | Hosting |
|---|---|---|
| Next.js 14 (App Router) | Owner dashboard | Vercel |
| Tailwind CSS + shadcn/ui | Styling and components | — |
| Recharts | Analytics charts | — |

### Database & Auth

| Technology | Role | Free Tier |
|---|---|---|
| Supabase PostgreSQL | Main database with RLS | 500MB free |
| Supabase Auth | Owner login (email + Google) | 50k MAU free |
| Supabase Realtime | Live dashboard updates | Included |

### Supporting Services

| Service | Role |
|---|---|
| Razorpay | Subscription billing (Starter / Growth / Multi-shop) |
| Resend | Transactional emails |

---

## 💰 Pricing Plans

| Plan | Price | Shops | Conversations |
|---|---|---|---|
| **Starter** | ₹499/month | 1 | 500/month |
| **Growth** | ₹1,299/month | 1 | Unlimited |
| **Multi-shop** | ₹2,999/month | Up to 5 | Unlimited |
| **Enterprise** | Custom | Unlimited | Unlimited |

All plans include a **14-day free trial** on the Growth plan.

---

## 🗄️ Database Schema

| Table | Purpose |
|---|---|
| `shops` | Business profiles — name, type, menu, hours, FAQs, plan, subscription status |
| `conversations` | One row per unique customer per shop, tracks message count |
| `messages` | Every inbound and outbound message with intent classification |
| `orders` | Captured orders with JSONB items, total, status, customer notes |
| `bookings` | Appointments with datetime, service, customer name, status |
| `digests` | Daily summary records per shop (messages, orders, bookings, revenue) |
| `auth.users` | Owner accounts — managed by Supabase Auth |

Row Level Security is enabled on all tables. Owners can only access their own shop data.

---

## 📁 Project Structure

```
ShopBot/
├── backend/                    # Node.js API + WhatsApp bot
│   ├── src/
│   │   ├── config/             # Plan definitions
│   │   ├── db/                 # SQL schema
│   │   ├── middleware/         # Auth, rate limiting, plan checks, error handling
│   │   ├── routes/             # Express route handlers
│   │   └── services/           # Business logic layer
│   ├── scripts/                # Seed, test, and digest scripts
│   └── index.js                # Entry point
├── dashboard/                  # Next.js owner dashboard
│   ├── app/                    # App Router pages
│   ├── components/             # Shared UI components
│   └── lib/                    # Supabase + API clients
├── LAUNCH_CHECKLIST.md         # Pre-launch verification checklist
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
2. Open the **SQL Editor** and run the contents of `backend/src/db/schema.sql`
3. Copy your project URL, anon key, and service role key into `.env`

### 4. Set up the dashboard

```bash
cd ../dashboard
npm install
cp .env.local.example .env.local
# Fill in Supabase URL and anon key
```

### 5. Run locally

```bash
# Terminal 1 — Backend
cd backend && node index.js
# Scan the QR code with WhatsApp when it appears

# Terminal 2 — Dashboard
cd dashboard && npm run dev
```

### 6. Open the dashboard

Navigate to [http://localhost:3000](http://localhost:3000)

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
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL (default: `http://localhost:3001`) |

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
3. Add the three `NEXT_PUBLIC_*` environment variables
4. Deploy — Vercel auto-detects Next.js

---

## 📊 Core Workflows

### Customer Message Flow (< 2 seconds)

```
1. Customer sends WhatsApp message
2. Backend receives via event listener
3. Shop profile loaded from cache (60s TTL)
4. Last 10 messages fetched for conversation context
5. Groq AI generates reply + detects intent
6. Reply sent to customer FIRST (speed priority)
7. Message saved to Supabase
8. If order/booking detected → extract, save, notify owner via WhatsApp
```

### Owner Order Confirmation

```
1. Owner receives WhatsApp notification with order details
2. Owner replies CONFIRM ORD-xxx or CANCEL ORD-xxx
3. Backend updates order status
4. Customer receives confirmation/cancellation message
```

### Daily Digest (7:50am IST)

```
1. node-cron triggers at 07:50 Asia/Kolkata
2. All active shops fetched, processed in batches of 10
3. Previous day's stats aggregated per shop (messages, orders, bookings, revenue)
4. Summary formatted and sent to owner's WhatsApp
5. Digest record saved to database
```

---

## 🗺️ Roadmap

- [ ] Meta Cloud API migration (replace whatsapp-web.js)
- [ ] Multi-language support beyond Hindi/English
- [ ] Payment collection via WhatsApp
- [ ] Inventory management integration
- [ ] Mobile app for shop owners
- [ ] Analytics API for enterprise customers

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
