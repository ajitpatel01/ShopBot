-- ShopBot — Complete Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SHOPS
CREATE TABLE shops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  type                TEXT CHECK (type IN ('restaurant','salon','pharmacy','grocery','other')),
  whatsapp_number     TEXT UNIQUE NOT NULL,
  owner_whatsapp      TEXT NOT NULL,
  menu                JSONB DEFAULT '[]',
  hours               JSONB DEFAULT '{}',
  faqs                JSONB DEFAULT '[]',
  bot_tone            TEXT DEFAULT 'friendly' CHECK (bot_tone IN ('formal','friendly','casual')),
  plan                TEXT DEFAULT 'starter',
  subscription_id     TEXT,
  subscription_status TEXT DEFAULT 'trial',
  trial_ends_at       TIMESTAMPTZ,
  plan_started_at     TIMESTAMPTZ,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- CONVERSATIONS
CREATE TABLE conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID REFERENCES shops(id) ON DELETE CASCADE,
  customer_phone   TEXT NOT NULL,
  customer_name    TEXT,
  last_message_at  TIMESTAMPTZ,
  message_count    INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, customer_phone)
);

-- MESSAGES
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID REFERENCES conversations(id) ON DELETE CASCADE,
  shop_id           UUID REFERENCES shops(id) ON DELETE CASCADE,
  direction         TEXT CHECK (direction IN ('inbound','outbound')),
  content           TEXT NOT NULL,
  intent            TEXT CHECK (intent IN ('faq','order','booking','complaint','escalation','other')),
  needs_owner_reply BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ORDERS
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID REFERENCES shops(id) ON DELETE CASCADE,
  conversation_id  UUID REFERENCES conversations(id),
  items            JSONB NOT NULL DEFAULT '[]',
  total            NUMERIC(10,2),
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed')),
  customer_note    TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- BOOKINGS
CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID REFERENCES shops(id) ON DELETE CASCADE,
  conversation_id  UUID REFERENCES conversations(id),
  service          TEXT,
  booking_datetime TIMESTAMPTZ,
  customer_name    TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- DIGESTS
CREATE TABLE digests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID REFERENCES shops(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  total_messages INT DEFAULT 0,
  new_orders     INT DEFAULT 0,
  new_bookings   INT DEFAULT 0,
  escalations    INT DEFAULT 0,
  sent_at        TIMESTAMPTZ,
  UNIQUE(shop_id, date)
);

-- INDEXES
CREATE INDEX idx_shops_owner_id ON shops(owner_id);
CREATE INDEX idx_conversations_shop_id ON conversations(shop_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
CREATE INDEX idx_messages_conversation_id_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_shop_id ON messages(shop_id);
CREATE INDEX idx_orders_shop_id ON orders(shop_id);
CREATE INDEX idx_bookings_shop_id ON bookings(shop_id);
CREATE INDEX idx_digests_shop_date ON digests(shop_id, date);

-- ROW LEVEL SECURITY
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES: owners can only access their own shop data
CREATE POLICY "owners_own_shops" ON shops
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "owners_own_conversations" ON conversations
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "owners_own_messages" ON messages
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "owners_own_orders" ON orders
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "owners_own_bookings" ON bookings
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "owners_own_digests" ON digests
  FOR ALL USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );
