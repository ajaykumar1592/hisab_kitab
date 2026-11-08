'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, MoreVertical, Edit, Eye, Trash2, Phone, MessageSquare, CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import { useTranslation } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';

interface Customer {
  id: string;
  name: string;
  mobile_number: string;
  whatsapp_number?: string;
  balance: number;
  last_transaction_date?: string;
  status: 'active' | 'archived';
}

export default function CustomersPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data for UI demonstration
  const mockCustomers: Customer[] = [
    {
      id: '1',
      name: 'Rajesh Kumar',
      mobile_number: '9876543210',
      whatsapp_number: '9876543210',
      balance: 15000,
      last_transaction_date: '2024-01-15',
      status: 'active',
    },
    {
      id: '2',
      name: 'Priya Sharma',
      mobile_number: '8765432109',
      whatsapp_number: '8765432109',
      balance: -5000,
      last_transaction_date: '2024-01-14',
      status: 'active',
    },
    {
      id: '3',
      name: 'Amit Patel',
      mobile_number: '7654321098',
      balance: 25000,
      last_transaction_date: '2024-01-10',
      status: 'active',
    },
    {
      id: '4',
      name: 'Sneha Singh',
      mobile_number: '6543210987',
      whatsapp_number: '6543210987',
      balance: 0,
      last_transaction_date: '2024-01-05',
      status: 'active',
    },
    {
      id: '5',
      name: 'Vikram Reddy',
      mobile_number: '5432109876',
      balance: -12000,
      last_transaction_date: '2024-01-01',
      status: 'archived',
    },
  ];

  const getAuthHeaders = async () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (e) {
      console.warn('Could not read session token', e);
    }
    return headers;
  };

  useEffect(() => {
    async function loadCustomers() {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/customers', { headers });
        if (response.ok) {
          const data = await response.json();
          if (data?.customers && data.customers.length > 0) {
            setCustomers(data.customers);
            return;
          }
        }
      } catch (e) {
        // use fallback
      }
      setCustomers(mockCustomers);
    }
    loadCustomers();
  }, []);

  const activeCustomersList = customers.length > 0 ? customers : mockCustomers;

  const filteredCustomers = activeCustomersList
    .filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (search) {
        const query = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(query) ||
          c.mobile_number.includes(query) ||
          c.whatsapp_number?.includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => b.balance - a.balance);

  const handleAction = (action: string, customer: Customer) => {
    switch (action) {
      case 'view':
        router.push(`/dashboard/customers/${customer.id}`);
        break;
      case 'transaction':
        router.push(`/dashboard/ledger/new?customer=${customer.id}`);
        break;
      case 'payment':
        router.push(`/dashboard/ledger/new?customer=${customer.id}&type=payment`);
        break;
      case 'whatsapp':
        window.open(`https://wa.me/91${customer.whatsapp_number || customer.mobile_number}`, '_blank');
        break;
      case 'call':
        window.location.href = `tel:${customer.mobile_number}`;
        break;
      case 'edit':
        router.push(`/dashboard/customers/${customer.id}/edit`);
        break;
      case 'archive':
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? { ...c, status: c.status === 'active' ? 'archived' : 'active' } : c))
        );
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('customers')}</h1>
          <p className="text-gray-500">{t('manageCustomers')}</p>
        </div>
        <Link href="/dashboard/customers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('addCustomer')}
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="archived">{t('archived')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Mobile
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    WhatsApp
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Last Transaction
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <CreditCard className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No customers found</p>
                        <Link href="/dashboard/customers/new" className="mt-2 text-blue-600 hover:underline">
                          Add your first customer
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-500">ID: {customer.id.slice(0, 8)}...</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <a href={`tel:${customer.mobile_number}`} className="text-gray-600 hover:text-blue-600">
                          {customer.mobile_number}
                        </a>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        {customer.whatsapp_number ? (
                          <span className="text-green-600 text-sm">✓ Connected</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`font-semibold ${customer.balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(Math.abs(customer.balance))}
                          {customer.balance >= 0 ? ' Dr' : ' Cr'}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell text-gray-500 text-sm">
                        {customer.last_transaction_date
                          ? format(new Date(customer.last_transaction_date), 'dd MMM yyyy')
                          : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            customer.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleAction('view', customer)} title="View Ledger">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleAction('transaction', customer)} title="Add Transaction">
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleAction('payment', customer)} title="Receive Payment">
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          {customer.whatsapp_number && (
                            <Button variant="ghost" size="icon" onClick={() => handleAction('whatsapp', customer)} title="WhatsApp">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleAction('call', customer)} title="Call">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleAction('edit', customer)} title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}