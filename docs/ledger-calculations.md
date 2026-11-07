# Ledger Calculation Model

## Overview
Accurate financial ledger with proper balance calculations for customer receivables and supplier payables.

## Core Principles
1. All calculations server-side
2. Decimal/Numeric types for amounts
3. Transaction types define direction
4. Running balance calculated dynamically
5. Audit trail for all changes

## Transaction Types

### For Customer Receivables (Customers)
1. **Credit / Sale on Credit** (+)
   - Customer owes more
   - Increases outstanding balance
   - Example: Sold goods to customer on credit

2. **Debit / Payment Received** (-)
   - Customer pays
   - Decreases outstanding balance
   - Example: Customer paid cash

3. **Opening Balance**
   - Initial receivable amount
   - Opening balance type: Receivable/Payable

4. **Adjustment**
   - Increase or decrease balance
   - Requires reason/notes

5. **Sales Return**
   - Customer returns goods
   - Decreases outstanding balance

### For Supplier Payables (Suppliers)
1. **Purchase** (+)
   - Business owes more
   - Increases payable balance

2. **Payment Made** (-)
   - Business pays supplier
   - Decreases payable balance

## Balance Calculation Formula

### Customer Receivables
```
Running Balance = Previous Balance + Credit - Debit
```

### Supplier Payables
```
Running Balance = Previous Balance + Purchase - Payment Made
```

## SQL View for Customer Ledger

```sql
CREATE VIEW customer_ledger AS
SELECT 
    t.id,
    t.business_id,
    t.customer_id,
    t.transaction_date,
    t.transaction_type,
    t.amount,
    t.description,
    t.reference_number,
    -- Calculate running balance
    COALESCE(
        LAG(balance_after_transaction) OVER (
            PARTITION BY t.business_id, t.customer_id 
            ORDER BY t.transaction_date, t.created_at
        ), 
        c.opening_balance
    ) as previous_balance,
    -- Determine sign based on transaction type
    CASE 
        WHEN t.transaction_type IN ('credit', 'opening_receivable', 'adjustment_increase') 
            THEN t.amount
        WHEN t.transaction_type IN ('debit', 'payment_received', 'opening_payable', 'adjustment_decrease', 'sales_return')
            THEN -t.amount
        ELSE 0
    END as amount_delta,
    -- Running balance calculation
    (
        SELECT COALESCE(SUM(
            CASE 
                WHEN transaction_type IN ('credit', 'opening_receivable', 'adjustment_increase') 
                    THEN amount
                WHEN transaction_type IN ('debit', 'payment_received', 'opening_payable', 'adjustment_decrease', 'sales_return')
                    THEN -amount
                ELSE 0
            END
        ), 0)
        FROM transactions t2
        WHERE t2.business_id = t.business_id
        AND t2.customer_id = t.customer_id
        AND (t2.transaction_date < t.transaction_date 
             OR (t2.transaction_date = t.transaction_date AND t2.created_at <= t.created_at))
    ) + COALESCE(c.opening_balance, 0) as running_balance
FROM transactions t
JOIN customers c ON t.customer_id = c.id
WHERE t.deleted_at IS NULL;
```

## Critical Test Cases

### Test 1: Opening Balance
Opening Balance = ₹1,000 receivable
Expected Outstanding = ₹1,000

### Test 2: Add Credit
Opening: ₹1,000
Add Credit: ₹500
Expected: ₹1,500

### Test 3: Receive Payment
Previous: ₹1,500
Payment: ₹300
Expected: ₹1,200

### Test 4: Edit Transaction
Previous: ₹1,200
Edit credit from ₹500 to ₹700 (increase by ₹200)
Expected: ₹1,400

### Test 5: Delete Transaction
Previous: ₹1,400
Reverse ₹700 transaction
Expected: ₹700

### Test 6: Multiple Transactions Same Day
Same date, different times
Order by created_at for correct sequence

### Test 7: Partial Payment
Outstanding: ₹1,000
Partial payment: ₹300
Expected: ₹700

## Edit/Delete Transaction Handling

### Option 1: Reversal Transaction (Recommended)
When editing/deleting:
1. Create reversal transaction
2. Create new transaction with corrected amount
3. Maintain audit trail
4. Never delete financial records

### Option 2: Recalculate Ledger
1. Mark transaction as updated
2. Recalculate all subsequent running balances
3. Requires transaction lock
4. More complex but clean

## Implementation Recommendation
Use reversal transactions for simplicity and audit compliance.

## Database Functions

### Get Customer Balance
```sql
CREATE OR REPLACE FUNCTION get_customer_balance(
    p_business_id UUID,
    p_customer_id UUID
) RETURNS NUMERIC AS $$
DECLARE
    opening_balance NUMERIC;
    total_credits NUMERIC;
    total_debits NUMERIC;
BEGIN
    SELECT COALESCE(opening_balance, 0) INTO opening_balance
    FROM customers
    WHERE id = p_customer_id AND business_id = p_business_id;
    
    SELECT COALESCE(SUM(
        CASE 
            WHEN transaction_type IN ('credit', 'opening_receivable', 'adjustment_increase')
                THEN amount
            WHEN transaction_type IN ('debit', 'payment_received', 'opening_payable', 'adjustment_decrease', 'sales_return')
                THEN -amount
            ELSE 0
        END
    ), 0) INTO total_credits
    FROM transactions
    WHERE business_id = p_business_id
    AND customer_id = p_customer_id
    AND deleted_at IS NULL;
    
    RETURN opening_balance + total_credits;
END;
$$ LANGUAGE plpgsql;
```

## Race Condition Prevention
- Use database transactions for all financial operations
- SELECT FOR UPDATE when editing transactions
- Idempotency keys for transaction creation
- Unique constraints on critical fields

## Audit Trail
All transactions must log:
- Who created/edited/deleted
- When it happened
- Old values vs New values
- IP address and user agent
