-- Add resolved status to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false;

-- Add owner notes to conversations  
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS owner_note TEXT;

-- Add index for resolved filter
CREATE INDEX IF NOT EXISTS idx_conversations_resolved 
ON conversations(shop_id, resolved);

-- Add proactive send log to prevent duplicate sends
CREATE TABLE IF NOT EXISTS proactive_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  send_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, customer_phone, send_type, (sent_at::date))
);

CREATE INDEX IF NOT EXISTS idx_proactive_sends_lookup 
ON proactive_sends(shop_id, customer_phone, sent_at);
