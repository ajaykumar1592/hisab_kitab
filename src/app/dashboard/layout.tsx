import { ReactNode } from 'react';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/client';
import { DashboardClientLayout } from './DashboardClientLayout';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: 'Home' },
  { name: 'Customers', href: '/dashboard/customers', icon: 'Users' },
  { name: 'Khata / Ledger', href: '/dashboard/ledger', icon: 'CreditCard' },
  { name: 'Rate List', href: '/dashboard/rate-list', icon: 'Package' },
  { name: 'Receipts', href: '/dashboard/receipts', icon: 'Receipt' },
  { name: 'Reports', href: '/dashboard/reports', icon: 'BarChart2' },
  { name: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
];

async function getBusiness() {
  try {
    const supabase = createServerClient();

    // We can't get user directly in server component without cookies
    // So we'll use the first business as fallback
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, name, logo_url, currency, default_language')
      .order('created_at', { ascending: true })
      .limit(1);

    if (businesses?.length) {
      return businesses[0];
    }

    return {
      id: 'demo',
      name: 'Hisab Kitab Store',
      currency: 'INR',
    };
  } catch (error) {
    console.error('Error fetching business:', error);
    return {
      id: 'demo',
      name: 'Hisab Kitab Store',
      currency: 'INR',
    };
  }
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const business = await getBusiness();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardClientLayout business={business}>
        {children}
      </DashboardClientLayout>
    </div>
  );
}