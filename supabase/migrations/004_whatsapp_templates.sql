-- WhatsApp Templates table
CREATE TABLE whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    category TEXT NOT NULL CHECK (category IN ('marketing', 'utility', 'authentication')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    meta_template_id TEXT,
    meta_namespace TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, name)
);

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
    BEFORE UPDATE ON whatsapp_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for templates
CREATE INDEX idx_whatsapp_templates_business ON whatsapp_templates(business_id, status);
CREATE INDEX idx_whatsapp_templates_name ON whatsapp_templates(business_id, name);

-- Update whatsapp_configurations table to add missing columns
ALTER TABLE whatsapp_configurations
ADD COLUMN IF NOT EXISTS default_template_namespace TEXT;

-- Update whatsapp_messages table to add missing columns for better tracking
ALTER TABLE whatsapp_messages
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reference_id TEXT,
ADD COLUMN IF NOT EXISTS reference_type TEXT CHECK (reference_type IN ('receipt', 'statement', 'reminder', 'custom'));

-- Add index for message lookup by template
CREATE INDEX idx_whatsapp_messages_template ON whatsapp_messages(business_id, template_id);
CREATE INDEX idx_whatsapp_messages_reference ON whatsapp_messages(business_id, reference_id, reference_type);