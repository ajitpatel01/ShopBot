ALTER TABLE shops
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Auto-generate slugs for existing shops
UPDATE shops
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);
