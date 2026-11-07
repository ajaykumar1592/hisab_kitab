# Digital Khata Book - Customer Ledger & Business Management System

A complete, production-ready digital khata book application for Indian businesses with customer ledger management, rate list management, WhatsApp integration, and PDF generation.

## 🚀 Features

### Core Modules
- **Customer Management**: Complete customer profiles with contact details, opening balances
- **Digital Ledger**: Accurate credit/debit tracking with running balances
- **Transaction Management**: Credit, debit, payments, adjustments with audit trail
- **Rate List Master**: Centralized product catalog with categories and pricing
- **Payment Receipts**: Professional receipts with PDF generation
- **Customer Statements**: Detailed ledger PDFs with Hindi/English support
- **WhatsApp Integration**: Official Meta WhatsApp Business Cloud API integration
- **Dashboard**: Business overview with key metrics and charts
- **Reports**: Comprehensive reporting with export capabilities

## 🛠 Tech Stack

**Frontend:**
- Next.js 14 with TypeScript
- Tailwind CSS
- shadcn/ui components
- React Hook Form + Zod
- TanStack Query

**Backend:**
- Next.js API Routes / Server Actions
- Supabase PostgreSQL
- Supabase Auth
- Row Level Security

## 📦 Installation

1. Clone repository
```bash
git clone https://github.com/yourusername/hisab-kitab.git
cd hisab-kitab
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env.local
```

4. Run development server
```bash
npm run dev
```

## 📚 Documentation

- [Architecture](./docs/architecture.md)
- [Database Schema](./docs/database-schema.md)
- [Ledger Calculations](./docs/ledger-calculations.md)
- [API Design](./docs/api-design.md)
- [Deployment Guide](./docs/deployment-guide.md)

## 🔐 Security Features

- Row Level Security (RLS) for multi-tenancy
- Server-side financial calculations
- Input validation with Zod
- CSRF protection
- Secure environment variables
- Audit logging

## 🚀 Deployment

See `docs/deployment-guide.md` for step-by-step instructions

## 📄 License

MIT License

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
