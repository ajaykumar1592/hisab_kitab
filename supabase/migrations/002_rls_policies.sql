-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check business membership
CREATE OR REPLACE FUNCTION user_has_business_access(business_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM business_members
        WHERE business_id = business_uuid
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's businesses
CREATE OR REPLACE FUNCTION get_user_businesses()
RETURNS TABLE(business_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT bm.business_id
    FROM business_members bm
    WHERE bm.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Businesses policies
CREATE POLICY "Users can view their businesses" ON businesses
    FOR SELECT USING (owner_id = auth.uid() OR user_has_business_access(id));

CREATE POLICY "Users can create businesses" ON businesses
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Business owners can update their businesses" ON businesses
    FOR UPDATE USING (owner_id = auth.uid());

-- Business members policies
CREATE POLICY "Users can view business members" ON business_members
    FOR SELECT USING (user_has_business_access(business_id));

CREATE POLICY "Business owners can manage members" ON business_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE id = business_members.business_id
            AND owner_id = auth.uid()
        )
    );

-- Customers policies
CREATE POLICY "Users can view customers of their businesses" ON customers
    FOR SELECT USING (user_has_business_access(business_id));

CREATE POLICY "Users can create customers" ON customers
    FOR INSERT WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Users can update customers" ON customers
    FOR UPDATE USING (user_has_business_access(business_id));

CREATE POLICY "Users can delete customers" ON customers
    FOR DELETE USING (user_has_business_access(business_id));

-- Product categories policies
CREATE POLICY "Users can view categories of their businesses" ON product_categories
    FOR SELECT USING (user_has_business_access(business_id));

CREATE POLICY "Users can manage categories" ON product_categories
    FOR ALL USING (user_has_business_access(business_id));

-- Products policies
CREATE POLICY "Users can view products of their businesses" ON products
    FOR SELECT USING (user_has_business_access(business_id));

CREATE POLICY "Users can create products" ON products
    FOR INSERT WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Users can update products" ON products
    FOR UPDATE USING (user_has_business_access(business_id));

CREATE POLICY "Users can delete products" ON products
    FOR DELETE USING (user_has_business_access(business_id));

-- Transactions policies
CREATE POLICY "Users can view transactions of their businesses" ON transactions
    FOR SELECT USING (user_has_business_access(business_id));

CREATE POLICY "Users can create transactions" ON transactions
    FOR INSERT WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Users can update transactions" ON transactions
    FOR UPDATE USING (user_has_business_access(business_id));

CREATE POLICY "Users can delete transactions" ON transactions
    FOR DELETE USING (user_has_business_access(business_id));

-- Payment receipts policies
CREATE POLICY "Users can view payment receipts of their businesses" ON payment_receipts
    FOR SELECT USING (user_has_business_access(business_id));

CREATE POLICY "Users can create payment receipts" ON payment_receipts
    FOR INSERT WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Users can update payment receipts" ON payment_receipts
    FOR UPDATE USING (user_has_business_access(business_id));

CREATE POLICY "Users can delete payment receipts" ON payment_receipts
    FOR DELETE USING (user_has_business_access(business_id));

-- WhatsApp configurations policies
CREATE POLICY "Users can view whatsapp configs of their businesses" ON whatsapp_configurations
    FOR SELECT USING (user_has_business_access(business_id));

CREATE POLICY "Business owners can manage whatsapp configs" ON whatsapp_configurations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE id = whatsapp_configurations.business_id
            AND owner_id = auth.uid()
        )
    );

-- WhatsApp messages policies
CREATE POLICY "Users can view whatsapp messages of their businesses" ON whatsapp_messages
    FOR SELECT USING (user_has_business_access(business_id));

CREATE POLICY "Users can create whatsapp messages" ON whatsapp_messages
    FOR INSERT WITH CHECK (user_has_business_access(business_id));

-- WhatsApp templates policies
CREATE POLICY "Users can view whatsapp templates of their businesses" ON whatsapp_templates
    FOR SELECT USING (user_has_business_access(business_id));

CREATE POLICY "Users can create whatsapp templates" ON whatsapp_templates
    FOR INSERT WITH CHECK (user_has_business_access(business_id));

CREATE POLICY "Users can update whatsapp templates" ON whatsapp_templates
    FOR UPDATE USING (user_has_business_access(business_id));

CREATE POLICY "Users can delete whatsapp templates" ON whatsapp_templates
    FOR DELETE USING (user_has_business_access(business_id));

-- Business settings policies
CREATE POLICY "Users can view business settings" ON business_settings
    FOR SELECT USING (user_has_business_access(business_id));

CREATE POLICY "Business owners can manage settings" ON business_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE id = business_settings.business_id
            AND owner_id = auth.uid()
        )
    );

-- Audit logs policies
CREATE POLICY "Users can view audit logs of their businesses" ON audit_logs
    FOR SELECT USING (user_has_business_access(business_id));

CREATE POLICY "System can create audit logs" ON audit_logs
    FOR INSERT WITH CHECK (user_has_business_access(business_id));
