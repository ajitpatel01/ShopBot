# ShopBot Launch Checklist

## Infrastructure
- [ ] Backend running on Railway (deploy from GitHub)
- [ ] Dashboard deployed on Vercel (connect GitHub repo)
- [ ] Supabase production project (separate from dev)
- [ ] All .env vars set in Railway and Vercel dashboards
- [ ] .gitignore verified — no .env files in git history

## WhatsApp
- [ ] Dedicated SIM card for the business number
- [ ] QR scanned, session persists across restarts
- [ ] Test message sent and received end-to-end
- [ ] Owner notification delivered to owner's personal number
- [ ] Owner can CONFIRM/CANCEL orders from WhatsApp

## Database
- [ ] Schema.sql run on production Supabase project
- [ ] RLS policies active and tested
- [ ] At least one real shop inserted with full profile

## Billing
- [ ] Razorpay plans created (Starter, Growth, Multi-shop)
- [ ] Plan IDs added to production .env
- [ ] Razorpay webhook URL registered
- [ ] Test subscription flow end-to-end

## Quality
- [ ] No hardcoded API keys (grep -r "gsk_\|eyJ\|rzp_" src/)
- [ ] All routes return JSON errors (not HTML)
- [ ] GET /health returns 200 in production
- [ ] Daily digest tested manually (node scripts/runDigest.js)
- [ ] Rate limiting tested

## Product
- [ ] At least 2 real demo shops onboarded
- [ ] End-to-end demo recorded as video
- [ ] README complete with setup + demo link
- [ ] Launch post written for ProductHunt / local business groups

## Go-live Steps
1. Deploy backend to Railway
2. Set all env vars in Railway
3. Deploy dashboard to Vercel
4. Set all env vars in Vercel
5. Run schema.sql on production Supabase
6. Connect WhatsApp on production server
7. Insert first real shop
8. Send test message
9. Confirm owner receives notification
10. Launch! 🚀
