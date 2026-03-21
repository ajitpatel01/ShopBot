-- Referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id),
  code TEXT UNIQUE NOT NULL,
  uses_count INT DEFAULT 0,
  max_uses INT DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Referral redemptions
CREATE TABLE IF NOT EXISTS referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID REFERENCES referral_codes(id),
  referrer_shop_id UUID REFERENCES shops(id),
  referee_shop_id UUID REFERENCES shops(id),
  referrer_rewarded BOOLEAN DEFAULT false,
  referee_rewarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  rewarded_at TIMESTAMPTZ,
  UNIQUE(referee_shop_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_shop
ON referral_codes(shop_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code
ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_redemptions_referrer
ON referral_redemptions(referrer_shop_id);
