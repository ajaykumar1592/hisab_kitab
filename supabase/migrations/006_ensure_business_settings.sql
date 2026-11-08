-- Migration: Ensure business_settings rows exist for all businesses
-- Run this in Supabase SQL Editor if business_settings rows are missing

-- Insert default settings for any business that doesn't have one yet
INSERT INTO business_settings (business_id, default_currency, default_language, receipt_number_format, invoice_number_format, whatsapp_enabled, email_enabled)
SELECT 
  b.id,
  COALESCE(b.currency, 'INR'),
  COALESCE(b.default_language, 'en'),
  'RCP-{YYYY}-{SEQ}',
  'INV-{YYYY}-{SEQ}',
  FALSE,
  FALSE
FROM businesses b
LEFT JOIN business_settings bs ON bs.business_id = b.id
WHERE bs.id IS NULL
ON CONFLICT (business_id) DO NOTHING;
