# Architecture Document

## Project Overview
Digital Khata Book - Customer Ledger, WhatsApp Integration & Rate List Management System

## Technology Stack

### Frontend
- Next.js 14 with TypeScript
- React 18
- Tailwind CSS
- shadcn/ui components
- Lucide icons
- React Hook Form + Zod validation
- TanStack Query
- PWA support

### Backend
- Next.js API Routes / Server Actions
- Supabase PostgreSQL
- Supabase Auth
- Row Level Security (RLS)

### PDF Generation
- pdf-lib for PDF generation
- Custom Hindi/English font support

### WhatsApp Integration
- Meta WhatsApp Business Cloud API
- Webhook verification
- Template messages

## Architecture Pattern
Clean Architecture with Service/Repository layers
- Components (UI)
- Services (Business Logic)
- Repositories (Data Access)
- Types (TypeScript interfaces)

## Multi-Tenancy Model
Every record belongs to a business_id for data isolation
- Row Level Security (RLS) policies enforce tenant isolation
- All queries filtered by business_id
- Users belong to businesses via business_members table

## Project Structure
```
src/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── customers/
│   │   ├── ledger/
│   │   ├── rate-list/
│   │   ├── reports/
│   │   └── settings/
│   └── api/
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── customers/
│   ├── ledger/
│   └── rate-list/
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── whatsapp/
│   ├── pdf/
│   └── validation/
├── services/
│   ├── customer.service.ts
│   ├── ledger.service.ts
│   ├── transaction.service.ts
│   ├── rate-list.service.ts
│   └── report.service.ts
├── types/
└── hooks/
```

## Key Features
1. Customer Management with ledger tracking
2. Credit/Debit transactions with accurate balance calculation
3. Rate List Master for products/prices
4. PDF generation for statements and rate lists
5. WhatsApp integration for notifications
6. Mobile-first responsive design
7. PWA support
8. Multi-tenant architecture

## Security Considerations
- All financial calculations server-side
- RLS policies for data isolation
- Environment variables for secrets
- Input validation with Zod
- CSRF protection
- SQL injection prevention via parameterized queries
