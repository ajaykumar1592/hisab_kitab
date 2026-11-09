-- Migration 007: Add transaction_items table and extend transactions with discount/tax fields

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Transaction Items table - stores individual line items for material-based transactions
CREATE TABLE transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,

    -- Snapshot of product data at time of transaction (for historical integrity)
    item_name TEXT NOT NULL,
    item_code TEXT,
    description TEXT,
    unit TEXT NOT NULL,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    rate NUMERIC(12,2) NOT NULL CHECK (rate >= 0),
    gst_percentage NUMERIC(5,2) DEFAULT 0 CHECK (gst_percentage >= 0 AND gst_percentage <= 100),

    -- Discount fields per line item
    discount_type TEXT DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'fixed')),
    discount_value NUMERIC(12,2) DEFAULT 0 CHECK (discount_value >= 0),

    -- Calculated fields
    line_subtotal NUMERIC(12,2) GENERATED ALWAYS AS (quantity * rate) STORED,
    discount_amount NUMERIC(12,2) GENERATED ALWAYS AS (
        CASE
            WHEN discount_type = 'percentage' THEN (quantity * rate * discount_value / 100)
            WHEN discount_type = 'fixed' THEN discount_value
            ELSE 0
        END
    ) STORED,
    taxable_amount NUMERIC(12,2) GENERATED ALWAYS AS ((quantity * rate) -
        CASE
            WHEN discount_type = 'percentage' THEN (quantity * rate * discount_value / 100)
            WHEN discount_type = 'fixed' THEN discount_value
            ELSE 0
        END
    ) STORED,
    gst_amount NUMERIC(12,2) GENERATED ALWAYS AS (
        ((quantity * rate) -
            CASE
                WHEN discount_type = 'percentage' THEN (quantity * rate * discount_value / 100)
                WHEN discount_type = 'fixed' THEN discount_value
                ELSE 0
            END
        ) * gst_percentage / 100
    ) STORED,
    line_total NUMERIC(12,2) GENERATED ALWAYS AS (
        ((quantity * rate) -
            CASE
                WHEN discount_type = 'percentage' THEN (quantity * rate * discount_value / 100)
                WHEN discount_type = 'fixed' THEN discount_value
                ELSE 0
            END
        ) * (1 + gst_percentage / 100)
    ) STORED,

    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add discount and tax fields to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'none' CHECK (discount_type IN ('none', 'percentage', 'fixed'));
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) DEFAULT 0 CHECK (discount_value >= 0);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS total_gst NUMERIC(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS grand_total NUMERIC(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- Create indexes for transaction_items
CREATE INDEX idx_transaction_items_business ON transaction_items(business_id);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_product ON transaction_items(product_id);
CREATE INDEX idx_transaction_items_sort ON transaction_items(transaction_id, sort_order);

-- Add updated_at trigger for transaction_items
CREATE TRIGGER update_transaction_items_updated_at BEFORE UPDATE ON transaction_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for invoice_number per business
ALTER TABLE transactions ADD CONSTRAINT unique_invoice_number UNIQUE (business_id, invoice_number);