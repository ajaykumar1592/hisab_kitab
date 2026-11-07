# Database Schema Design

## Overview
PostgreSQL with Supabase, using UUIDs for primary keys, ROW LEVEL SECURITY for multi-tenancy.

## Core Tables

### profiles
User profiles linked to Supabase Auth
- id (uuid, PK, FK to auth.users)
- email
- full_name
- created_at
- updated_at

### businesses
Business entities
- id (uuid, PK)
- owner_id (uuid, FK to profiles)
- name
- logo_url
- mobile_number
- whatsapp_number
- email
- address
- city
- state
- pin_code
- gstin
- business_type
- currency (default: INR)
- default_language
- financial_year_start
- created_at
- updated_at

### business_members
User-business associations
- id (uuid, PK)
- business_id (uuid, FK to businesses)
- user_id (uuid, FK to profiles)
- role (owner, admin, member)
- created_at

### customers
Customer records
- id (uuid, PK)
- business_id (uuid, FK to businesses)
- name
- mobile_number
- alternate_mobile_number
- whatsapp_number
- business_type
- address
- city
- state
- pin_code
- email
- gstin
- opening_balance (numeric, default 0)
- opening_balance_type (receivable/payable)
- notes
- status (active/archived)
- created_at
- updated_at
- UNIQUE(business_id, mobile_number)

### transactions
Financial transactions
- id (uuid, PK)
- business_id (uuid, FK to businesses)
- customer_id (uuid, FK to customers)
- transaction_date (date)
- transaction_type (credit/debit/payment/opening/adjustment/sales_return/purchase_return)
- amount (numeric, precision 12, scale 2)
- description
- reference_number
- payment_method (cash/upi/bank_transfer/cheque/other)
- created_by (uuid, FK to profiles)
- created_at
- updated_at
- deleted_at (soft delete)

### payment_receipts
Payment documentation
- id (uuid, PK)
- business_id (uuid, FK to businesses)
- customer_id (uuid, FK to customers)
- transaction_id (uuid, FK to transactions)
- receipt_number
- payment_amount (numeric)
- payment_date
- payment_method
- reference_number
- previous_outstanding (numeric)
- remaining_outstanding (numeric)
- notes
- created_at

### product_categories
Product categorization
- id (uuid, PK)
- business_id (uuid, FK to businesses)
- name
- description
- created_at

### products
Rate list items
- id (uuid, PK)
- business_id (uuid, FK to businesses)
- category_id (uuid, FK to product_categories)
- item_name
- item_code
- description
- unit
- quantity
- rate (numeric)
- gst_percentage (numeric)
- final_rate (numeric)
- minimum_order_quantity
- effective_date
- expiry_date
- status (active/inactive)
- created_at
- updated_at

### whatsapp_configurations
WhatsApp API settings per business
- id (uuid, PK)
- business_id (uuid, FK to businesses, unique)
- meta_app_id
- meta_app_secret (encrypted)
- whatsapp_business_account_id
- phone_number_id
- access_token (encrypted)
- webhook_verify_token
- api_version
- business_display_number
- is_active
- created_at
- updated_at

### whatsapp_messages
Message history
- id (uuid, PK)
- business_id (uuid, FK to businesses)
- customer_id (uuid, FK to customers)
- message_type (template/outbound/inbound)
- template_name
- message_content
- message_id (WhatsApp message ID)
- status (sent/delivered/read/failed)
- recipient_number
- sent_at
- delivered_at
- read_at
- error_message
- created_at

### audit_logs
System audit trail
- id (uuid, PK)
- business_id (uuid, FK to businesses)
- user_id (uuid, FK to profiles)
- action (create/update/delete)
- table_name
- record_id
- old_values (jsonb)
- new_values (jsonb)
- ip_address
- user_agent
- created_at

### business_settings
Business configuration
- id (uuid, PK)
- business_id (uuid, FK to businesses, unique)
- default_currency
- default_language
- financial_year_start
- receipt_number_format
- invoice_number_format
- whatsapp_enabled
- email_enabled
- created_at
- updated_at

## Indexes
- customers: (business_id, mobile_number)
- customers: (business_id, name)
- transactions: (business_id, customer_id, transaction_date)
- transactions: (business_id, created_at)
- products: (business_id, status)
- products: (business_id, category_id)
- whatsapp_messages: (business_id, customer_id)

## Row Level Security Policies
All tables with business_id will have RLS policies:
- Users can only access records where business_id matches their business membership
- SELECT, INSERT, UPDATE, DELETE policies check business membership

## Constraints
- Amount must be > 0
- Opening balance type must be receivable/payable
- Transaction type must be valid enum
- Payment method must be valid enum
- Customer mobile number unique per business
- Product codes unique per business

## Financial Integrity
- All amounts using NUMERIC type
- Transactions create audit trail
- Soft deletes for financial records
- Balance calculations use explicit SQL views/functions
- No cascading deletes on financial tables
