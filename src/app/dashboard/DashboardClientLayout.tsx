'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Menu, X, Home, Users, CreditCard, Package, BarChart2, Settings, LogOut, ChevronRight, Smartphone, Building2, Receipt, FileText, Share2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Khata / Ledger', href: '/dashboard/ledger', icon: CreditCard },
  { name: 'Rate List', href: '/dashboard/rate-list', icon: Package },
  { name: 'Receipts', href: '/dashboard/receipts', icon: Receipt },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart2 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface BusinessInfo {
  id: string;
  name: string;
  logo_url?: string;
  currency?: string;
  default_language?: string;
}

interface DashboardClientLayoutProps {
  business: BusinessInfo;
  children: ReactNode;
}

export function DashboardClientLayout({ business, children }: DashboardClientLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
    }
  }, []);

  useEffect(() => {
    async function fetchUser() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    router.push('/login');
    router.refresh();
  };

  // PWA Install handling
  const handleInstall = async () => {
    if (typeof window === 'undefined') return;
    alert('To install the app, use the "Install" or "Add to Home Screen" option in your browser menu.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Hisab Kitab</span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Business Info */}
          {business && (
            <div className="p-4 border-b border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Business</p>
              <p className="font-medium text-gray-900 truncate">{business.name}</p>
              <p className="text-xs text-gray-500 truncate">{business.currency || 'INR'}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1" aria-label="Main navigation">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* PWA Actions */}
          <div className="px-4 pb-4 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-sm"
              onClick={handleInstall}
            >
              <Smartphone className="h-4 w-4" />
              Install App
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-sm"
              asChild
            >
              <Link href="/dashboard/export">
                <Download className="h-4 w-4" />
                Export Data
              </Link>
            </Button>
          </div>

          {/* Bottom */}
          <div className="p-4 border-t border-gray-200">
            <Button variant="outline" className="w-full justify-start gap-3" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:px-8">
          <button
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1 min-w-0">
            {pathname !== '/dashboard' && (
              <nav aria-label="Breadcrumb" className="flex items-center">
                <Link
                  href="/dashboard"
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Dashboard
                </Link>
                <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                <span className="text-gray-900 font-medium text-sm truncate">
                  {navigation.find(n => pathname.startsWith(n.href))?.name || 'Page'}
                </span>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* PWA Status */}
            {!isInstalled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleInstall}
                className="hidden sm:flex"
              >
                <Smartphone className="mr-1 h-4 w-4" />
                Install
              </Button>
            )}

            <span className="hidden sm:block text-sm text-gray-600">
              {business?.name || 'Loading...'}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}