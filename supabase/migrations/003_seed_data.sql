-- Seed data for development/testing
-- This should only be run in development environments

-- Insert default units (will be used as reference in application)
-- Note: Units are stored as text in products table, this is for reference

-- Default product categories (template for new businesses)
-- Actual categories will be created per business

-- Default business settings template
-- Applied when new business is created

-- Function to initialize business settings
CREATE OR REPLACE FUNCTION initialize_business_settings(p_business_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO business_settings (business_id)
    VALUES (p_business_id)
    ON CONFLICT (business_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
    p_business_id UUID,
    p_table_name TEXT,
    p_record_id UUID,
    p_action TEXT,
    p_old_values JSONB,
    p_new_values JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, old_values, new_values)
    VALUES (p_business_id, auth.uid(), p_action, p_table_name, p_record_id, p_old_values, p_new_values);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger functions for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_old JSONB;
    v_new JSONB;
    v_action TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        v_old := NULL;
        v_new := row_to_json(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'update';
        v_old := row_to_json(OLD);
        v_new := row_to_json(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
        v_old := row_to_json(OLD);
        v_new := NULL;
    END IF;

    PERFORM create_audit_log(
        COALESCE(NEW.business_id, OLD.business_id),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_action,
        v_old,
        v_new
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit triggers to key tables
CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_transactions
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_payment_receipts
    AFTER INSERT OR UPDATE OR DELETE ON payment_receipts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Function to calculate customer balance
CREATE OR REPLACE FUNCTION calculate_customer_balance(p_business_id UUID, p_customer_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_opening_balance NUMERIC(12,2);
    v_total_credits NUMERIC(12,2);
    v_total_debits NUMERIC(12,2);
BEGIN
    -- Get opening balance
    SELECT COALESCE(opening_balance, 0) INTO v_opening_balance
    FROM customers
    WHERE id = p_customer_id AND business_id = p_business_id;

    -- Calculate net from transactions
    SELECT COALESCE(SUM(
        CASE
            WHEN transaction_type IN ('credit', 'opening', 'adjustment') THEN amount
            WHEN transaction_type IN ('debit', 'payment', 'sales_return', 'purchase_return') THEN -amount
            ELSE 0
        END
    ), 0) INTO v_total_credits
    FROM transactions
    WHERE business_id = p_business_id
    AND customer_id = p_customer_id
    AND deleted_at IS NULL;

    RETURN v_opening_balance + v_total_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get customer ledger with running balance
CREATE OR REPLACE FUNCTION get_customer_ledger(
    p_business_id UUID,
    p_customer_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    transaction_date DATE,
    transaction_type TEXT,
    amount NUMERIC(12,2),
    description TEXT,
    reference_number TEXT,
    payment_method TEXT,
    running_balance NUMERIC(12,2),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_opening_balance NUMERIC(12,2);
BEGIN
    SELECT COALESCE(opening_balance, 0) INTO v_opening_balance
    FROM customers
    WHERE id = p_customer_id AND business_id = p_business_id;

    RETURN QUERY
    SELECT
        t.id,
        t.transaction_date,
        t.transaction_type,
        t.amount,
        t.description,
        t.reference_number,
        t.payment_method,
        v_opening_balance + SUM(
            CASE
                WHEN t2.transaction_type IN ('credit', 'opening', 'adjustment') THEN t2.amount
                WHEN t2.transaction_type IN ('debit', 'payment', 'sales_return', 'purchase_return') THEN -t2.amount
                ELSE 0
            END
        ) OVER (ORDER BY t2.transaction_date, t2.created_at ROWS UNBOUNDED PRECEDING) as running_balance,
        t.created_at
    FROM transactions t
    JOIN transactions t2 ON t.id = t2.id
    WHERE t.business_id = p_business_id
    AND t.customer_id = p_customer_id
    AND t.deleted_at IS NULL
    AND (p_start_date IS NULL OR t.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR t.transaction_date <= p_end_date)
    ORDER BY t.transaction_date, t.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate next receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number(p_business_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_format TEXT;
    v_year TEXT;
    v_seq INTEGER;
    v_result TEXT;
BEGIN
    SELECT receipt_number_format INTO v_format
    FROM business_settings
    WHERE business_id = p_business_id;

    IF v_format IS NULL THEN
        v_format := 'RCP-{YYYY}-{SEQ}';
    END IF;

    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(receipt_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1 INTO v_seq
    FROM payment_receipts
    WHERE business_id = p_business_id
    AND receipt_number LIKE v_format;

    v_result := REPLACE(v_format, '{YYYY}', v_year);
    v_result := REPLACE(v_result, '{SEQ}', LPAD(v_seq::TEXT, 4, '0'));

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate next transaction reference
CREATE OR REPLACE FUNCTION generate_transaction_reference(
    p_business_id UUID,
    p_transaction_type TEXT
)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_year TEXT;
    v_seq INTEGER;
    v_result TEXT;
BEGIN
    CASE p_transaction_type
        WHEN 'credit' THEN v_prefix := 'CR';
        WHEN 'debit' THEN v_prefix := 'DR';
        WHEN 'payment' THEN v_prefix := 'PY';
        WHEN 'opening' THEN v_prefix := 'OB';
        WHEN 'adjustment' THEN v_prefix := 'ADJ';
        ELSE v_prefix := 'TXN';
    END CASE;

    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(reference_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1 INTO v_seq
    FROM transactions
    WHERE business_id = p_business_id
    AND reference_number LIKE v_prefix || '-%';

    v_result := v_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;