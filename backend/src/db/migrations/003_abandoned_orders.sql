CREATE TABLE IF NOT EXISTS order_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  items_discussed JSONB DEFAULT '[]',
  follow_up_sent BOOLEAN DEFAULT false,
  follow_up_sent_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_intents_followup
ON order_intents(follow_up_sent, created_at)
WHERE follow_up_sent = false AND converted = false;
