# API Design Document

## Overview
RESTful API design using Next.js App Router with Server Actions

## Authentication
All API routes protected by Supabase Auth JWT

## Base URL
/api/v1

## Authentication Endpoints

### POST /api/auth/signup
Create new user account
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "business_name": "My Shop"
}

Response:
{
  "user": {...},
  "business": {...},
  "session": {...}
}
```

### POST /api/auth/login
User login
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST /api/auth/logout
Logout current user

## Business Endpoints

### GET /api/business/profile
Get business profile

### PUT /api/business/profile
Update business profile
```json
Request:
{
  "name": "Shop Name",
  "mobile_number": "9876543210",
  "whatsapp_number": "9876543210",
  "address": "...",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pin_code": "400001"
}
```

## Customer Endpoints

### GET /api/customers
List customers with pagination, search, filters
Query params:
- page=1
- limit=20
- search=query
- status=active
- sort=created_at
- order=desc

### POST /api/customers
Create customer
```json
Request:
{
  "name": "Customer Name",
  "mobile_number": "9876543210",
  "whatsapp_number": "9876543210",
  "address": "...",
  "opening_balance": 0,
  "opening_balance_type": "receivable",
  "notes": "..."
}
```

### GET /api/customers/[id]
Get customer details

### PUT /api/customers/[id]
Update customer

### DELETE /api/customers/[id]
Archive customer (soft delete)

## Transaction Endpoints

### GET /api/customers/[id]/transactions
Get customer ledger
Query params:
- start_date=2024-01-01
- end_date=2024-12-31
- transaction_type=credit
- page=1
- limit=50

### POST /api/transactions
Create transaction
```json
Request:
{
  "customer_id": "uuid",
  "transaction_date": "2024-01-15",
  "transaction_type": "credit",
  "amount": 1000.00,
  "description": "Sale of goods",
  "reference_number": "INV-001",
  "payment_method": "cash"
}
```

### GET /api/transactions/[id]
Get transaction details

### PUT /api/transactions/[id]
Update transaction (creates audit log)

### DELETE /api/transactions/[id]
Delete transaction (soft delete + audit log)

## Payment Receipt Endpoints

### POST /api/payments
Record payment
```json
Request:
{
  "customer_id": "uuid",
  "payment_amount": 500.00,
  "payment_date": "2024-01-15",
  "payment_method": "upi",
  "reference_number": "UPI123456",
  "notes": "Partial payment"
}
```

### GET /api/payments
List payments with filters

## Rate List Endpoints

### GET /api/products
List products
Query params:
- category_id=uuid
- search=query
- status=active
- page=1
- limit=50

### POST /api/products
Create product
```json
Request:
{
  "item_name": "Cement",
  "item_code": "CEM-001",
  "category_id": "uuid",
  "unit": "Bag",
  "rate": 350.00,
  "gst_percentage": 18,
  "status": "active"
}
```

### PUT /api/products/[id]
Update product

### DELETE /api/products/[id]
Delete product

### POST /api/products/bulk-import
Bulk import products from CSV

## Report Endpoints

### GET /api/reports/outstanding
Customer outstanding report
Query params:
- start_date
- end_date
- customer_id

### GET /api/reports/daily
Daily transaction report

### GET /api/reports/monthly
Monthly transaction report

### GET /api/reports/customer-ledger
Customer ledger report

### GET /api/reports/payment-received
Payment received report

## WhatsApp Endpoints

### GET /api/whatsapp/config
Get WhatsApp configuration

### PUT /api/whatsapp/config
Update WhatsApp configuration (encrypted)

### POST /api/whatsapp/send-statement
Send customer statement via WhatsApp
```json
Request:
{
  "customer_id": "uuid",
  "template_name": "account_statement",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```

### POST /api/whatsapp/send-reminder
Send payment reminder
```json
Request:
{
  "customer_id": "uuid",
  "template_name": "payment_reminder"
}
```

### POST /api/whatsapp/send-rate-list
Send rate list PDF
```json
Request:
{
  "customer_id": "uuid",
  "template_name": "rate_list"
}
```

### GET /api/whatsapp/messages
Get message history
Query params:
- customer_id
- status
- start_date
- end_date

### POST /api/whatsapp/webhook
Webhook endpoint for WhatsApp status updates

## PDF Endpoints

### GET /api/pdf/customer-statement/[id]
Generate customer statement PDF
Query params:
- start_date
- end_date

### GET /api/pdf/rate-list
Generate rate list PDF
Query params:
- category_id
- status=active

### GET /api/pdf/payment-receipt/[id]
Generate payment receipt PDF

## Dashboard Endpoints

### GET /api/dashboard/summary
Get dashboard summary
```json
Response:
{
  "total_customers": 150,
  "total_receivable": 125000,
  "total_payable": 45000,
  "today_credit": 15000,
  "today_debit": 8000,
  "today_payments": 12000,
  "this_month_sales": 450000,
  "this_month_payments": 380000
}
```

### GET /api/dashboard/recent-transactions
Get recent transactions

### GET /api/dashboard/outstanding-customers
Get customers with outstanding balances

## Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {...}
  }
}
```

## Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

## Security
- All endpoints require authentication
- Tenant isolation via RLS
- Input validation with Zod
- Rate limiting
- CORS configured
- CSRF protection
