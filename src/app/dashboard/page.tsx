'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, TrendingUp, CreditCard, Package, Plus, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/i18n';

interface DashboardStats {
  total_customers: number;
  total_receivable: number;
  total_payable: number;
  today_credit: number;
  today_debit: number;
  today_payments: number;
  this_month_sales: number;
  this_month_payments: number;
  outstanding_customers: Array<{
    id: string;
    name: string;
    mobile_number: string;
    balance: number;
    last_transaction_date: string;
  }>;
  recent_transactions: Array<{
    id: string;
    transaction_date: string;
    transaction_type: string;
    amount: number;
    description: string;
    customer_name: string;
  }>;
}

const defaultStats: DashboardStats = {
  total_customers: 5,
  total_receivable: 40000,
  total_payable: 17000,
  today_credit: 15000,
  today_debit: 5000,
  today_payments: 7000,
  this_month_sales: 125000,
  this_month_payments: 85000,
  outstanding_customers: [
    {
      id: '1',
      name: 'Rajesh Kumar',
      mobile_number: '9876543210',
      balance: 15000,
      last_transaction_date: '2024-01-15',
    },
    {
      id: '3',
      name: 'Amit Patel',
      mobile_number: '7654321098',
      balance: 25000,
      last_transaction_date: '2024-01-10',
    },
  ],
  recent_transactions: [
    {
      id: '1',
      transaction_date: '2024-01-15',
      transaction_type: 'credit',
      amount: 5000,
      description: 'Sale of cement bags',
      customer_name: 'Rajesh Kumar',
    },
    {
      id: '2',
      transaction_date: '2024-01-15',
      transaction_type: 'payment',
      amount: 2000,
      description: 'Payment received (UPI)',
      customer_name: 'Rajesh Kumar',
    },
    {
      id: '3',
      transaction_date: '2024-01-14',
      transaction_type: 'credit',
      amount: 15000,
      description: 'Steel rods purchase',
      customer_name: 'Amit Patel',
    },
  ],
};

export default function DashboardPage() {
  const { t, language } = useTranslation();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch('/api/reports/daily');
        if (response.ok) {
          const data = await response.json();
          if (data && data.stats) {
            setStats(data.stats);
          }
        }
      } catch (err) {
        // Fallback to demo stats
      }
    }
    loadStats();
  }, []);

  const statCards = [
    {
      title: t('totalCustomers'),
      value: stats.total_customers.toLocaleString('en-IN'),
      icon: Users,
      color: 'bg-blue-500',
      href: '/dashboard/customers',
    },
    {
      title: t('totalReceivable'),
      value: formatCurrency(stats.total_receivable),
      icon: TrendingUp,
      color: 'bg-green-500',
      href: '/dashboard/reports',
    },
    {
      title: t('totalPayable'),
      value: formatCurrency(stats.total_payable),
      icon: CreditCard,
      color: 'bg-red-500',
      href: '/dashboard/reports',
    },
    {
      title: t('rateListItems'),
      value: '5',
      icon: Package,
      color: 'bg-purple-500',
      href: '/dashboard/rate-list',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard')}</h1>
          <p className="text-gray-500">{t('overviewBusiness')}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/customers/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('addCustomer')}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/ledger/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('addTransaction')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color} text-white p-1 rounded`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="mt-2 text-xs h-auto px-2 text-gray-500 hover:text-gray-700"
              >
                <Link href={stat.href}>{t('viewDetails')}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t('todayCredit')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.today_credit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t('todayPayments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.today_payments)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t('thisMonthSales')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats.this_month_sales)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">{t('thisMonthPayments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.this_month_payments)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Customers & Recent Transactions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Outstanding Customers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('outstandingCustomers')}</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/reports">{t('viewAll')}</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.outstanding_customers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t('noOutstanding')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.outstanding_customers.slice(0, 5).map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.mobile_number}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-red-600">
                        {formatCurrency(customer.balance)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(customer.last_transaction_date), 'dd MMM')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('recentTransactions')}</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/ledger">{t('viewAll')}</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recent_transactions.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t('noRecentTxn')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent_transactions.slice(0, 5).map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{txn.description || (language === 'hi' ? 'लेन-देन' : 'Transaction')}</p>
                      <p className="text-sm text-gray-500">{txn.customer_name}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`font-semibold ${
                        ['credit', 'opening'].includes(txn.transaction_type) ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {['credit', 'opening'].includes(txn.transaction_type) ? '+' : '-'}
                        {formatCurrency(txn.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(txn.transaction_date), 'dd MMM')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}