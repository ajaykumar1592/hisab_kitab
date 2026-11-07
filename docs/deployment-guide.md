# Deployment Guide

## Prerequisites
- Node.js 18+ installed
- Supabase account (free tier available)
- Vercel account (free tier available)
- GitHub account

## Step 1: Create GitHub Repository

```bash
cd C:/xampp/htdocs/hisab_kitab
git init
git add .
git commit -m "Initial commit: Digital Khata Book application"
git branch -M main
git remote add origin https://github.com/yourusername/hisab-kitab.git
git push -u origin main
```

## Step 2: Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose organization
4. Name project: `hisab-kitab`
5. Database password: Generate strong password
6. Region: Choose closest to your users
7. Click "Create new project"
8. Wait for project to be ready (~2 minutes)

## Step 3: Configure Supabase Database

1. In Supabase dashboard, go to SQL Editor
2. Run migrations (see supabase/migrations/)

## Step 4: Configure Supabase Auth

1. Go to Authentication > Settings
2. Enable email/password authentication
3. Configure email templates
4. Set site URL: `https://your-app.vercel.app`
5. Add redirect URLs

## Step 5: Create Supabase Storage Buckets

1. Go to Storage
2. Create buckets:
   - `business-logos`
   - `customer-documents`
   - `pdf-statements`
   - `rate-list-pdfs`
3. Configure RLS policies for each bucket

## Step 6: Get Supabase Credentials

1. Go to Settings > API
2. Copy:
   - Project URL
   - Anon public key
   - Service role key (keep secret!)

## Step 7: Deploy to Vercel

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import Git Repository
4. Select `hisab-kitab` repository
5. Configure build settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

## Step 8: Configure Environment Variables

In Vercel dashboard, go to Settings > Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
APP_URL=https://your-app.vercel.app
```

## Step 9: Deploy

Click "Deploy" in Vercel dashboard
Wait for build to complete (~3-5 minutes)
Access your app at the provided URL

## Step 10: Configure WhatsApp Cloud API

1. Go to https://developers.facebook.com
2. Create app or use existing
3. Add WhatsApp Business product
4. Create WhatsApp Business Account
5. Configure Phone Number
6. Get credentials:
   - Meta App ID
   - Meta App Secret
   - WhatsApp Business Account ID
   - Phone Number ID
   - Access Token
   - Webhook Verify Token

7. Set webhook URL:
   - URL: `https://your-app.vercel.app/api/whatsapp/webhook`
   - Verify token: (from env)
   - Subscribe to messages, message_deliveries

8. Get templates approved for:
   - Payment Reminder
   - Payment Received
   - Account Statement
   - Rate List

## Step 11: Update Environment Variables

Add WhatsApp variables to Vercel:
```env
WHATSAPP_API_VERSION=v18.0
WHATSAPP_PHONE_NUMBER_ID=xxx
WHATSAPP_BUSINESS_ACCOUNT_ID=xxx
WHATSAPP_ACCESS_TOKEN=xxx
WHATSAPP_WEBHOOK_VERIFY_TOKEN=xxx
WHATSAPP_APP_SECRET=xxx
WHATSAPP_BUSINESS_DISPLAY_NUMBER=xxx
```

## Step 12: Configure Domain (Optional)

1. In Vercel, go to Project > Settings > Domains
2. Add custom domain
3. Configure DNS records as instructed
4. SSL certificate auto-provisioned

## Step 13: Database Backup

Supabase free tier includes automatic backups
For production:
1. Set up pg_dump cron job
2. Store backups in S3/cloud storage
3. Test restore procedure

## Step 14: Monitoring

1. Enable Vercel Analytics
2. Set up Supabase monitoring
3. Configure error tracking (Sentry)
4. Set up uptime monitoring

## Step 15: Post-Deployment Checklist

- [ ] Test user registration
- [ ] Test login/logout
- [ ] Test customer creation
- [ ] Test transaction creation
- [ ] Test ledger calculations
- [ ] Test PDF generation
- [ ] Test WhatsApp webhook
- [ ] Test mobile responsiveness
- [ ] Test PWA installation
- [ ] Verify RLS policies
- [ ] Test multi-tenant isolation

## Troubleshooting

### Build Fails
- Check Node version compatibility
- Verify all dependencies installed
- Check build logs in Vercel

### Database Connection Issues
- Verify Supabase URL and keys
- Check network connectivity
- Verify RLS policies

### WhatsApp Webhook Issues
- Verify webhook URL is accessible
- Check verify token matches
- Verify webhook signature validation

## Updating Production

```bash
git add .
git commit -m "Update feature"
git push origin main
# Vercel auto-deploys
```

## Rollback

In Vercel dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "..." > Promote to Production

## Free Tier Limitations

Supabase Free:
- 500MB database
- 2GB file storage
- 50,000 monthly active users

Vercel Hobby:
- 100GB bandwidth/month
- Serverless function limits
- No custom server

Upgrade when needed for production use.
