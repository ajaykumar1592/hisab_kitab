'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, Calendar, Download, CreditCard, Trash2, Edit, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  description: string;
  reference_number: string;
  payment_method: string;
  customer_name: string;
  customer_id: string;
  running_balance?: number;
}

export default function LedgerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);

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
    async function loadTransactions() {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/transactions', { headers });
        if (response.ok) {
          const data = await response.json();
          if (data?.transactions && data.transactions.length > 0) {
            setTransactions(data.transactions);
          }
        }
      } catch (e) {
        // Fallback handled by showing empty state
      }
    }
    loadTransactions();
  }, []);

  const filteredTransactions = transactions
    .filter((t) => {
      if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
      if (search) {
        const query = search.toLowerCase();
        return (
          t.customer_name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.reference_number.toLowerCase().includes(query)
        );
      }
      if (dateFilter !== 'all' && dateFilter !== 'custom') {
        const txnDate = new Date(t.transaction_date);
        const now = new Date();
        let start: Date;
        let end: Date = endOfDay(now);

        switch (dateFilter) {
          case 'today':
            start = startOfDay(now);
            break;
          case 'yesterday':
            start = startOfDay(subDays(now, 1));
            end = endOfDay(subDays(now, 1));
            break;
          case 'week':
            start = startOfWeek(now);
            break;
          case 'month':
            start = startOfMonth(now);
            break;
          case 'last_month':
            start = startOfMonth(subMonths(now, 1));
            end = endOfMonth(subMonths(now, 1));
            break;
          default:
            return true;
        }
        return txnDate >= start && txnDate <= end;
      }
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        const txnDate = new Date(t.transaction_date);
        const start = startOfDay(new Date(customStartDate));
        const end = endOfDay(new Date(customEndDate));
        return txnDate >= start && txnDate <= end;
      }
      return true;
    })
    .sort((a, b) =>
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'credit':
      case 'opening':
        return 'bg-red-50 text-red-700';
      case 'debit':
      case 'payment':
        return 'bg-green-50 text-green-700';
      case 'adjustment':
        return 'bg-blue-50 text-blue-700';
      case 'sales_return':
      case 'purchase_return':
        return 'bg-orange-50 text-orange-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      credit: 'Credit Sale',
      debit: 'Debit',
      payment: 'Payment Received',
      opening: 'Opening Balance',
      adjustment: 'Adjustment',
      sales_return: 'Sales Return',
      purchase_return: 'Purchase Return',
    };
    return labels[type] || type;
  };

  const totals = {
    credit: filteredTransactions
      .filter((t) => ['credit', 'opening', 'adjustment'].includes(t.transaction_type))
      .reduce((sum, t) => sum + t.amount, 0),
    debit: filteredTransactions
      .filter((t) => ['debit', 'payment', 'sales_return', 'purchase_return'].includes(t.transaction_type))
      .reduce((sum, t) => sum + t.amount, 0),
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
      } else {
        const result = await response.json();
        alert(result.error?.message || 'Failed to delete transaction');
      }
    } catch (err) {
      alert('An error occurred while deleting the transaction');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Khata / Ledger</h1>
          <p className="text-gray-500">All transactions across customers</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/ledger/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/ledger/new?type=payment">
              <CreditCard className="mr-2 h-4 w-4" />
              Receive Payment
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.credit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Debit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.debit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.credit - totals.debit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(totals.credit - totals.debit))}
              {totals.credit - totals.debit >= 0 ? ' Dr' : ' Cr'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customer, description, ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Credit Sale</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
                <SelectItem value="payment">Payment Received</SelectItem>
                <SelectItem value="opening">Opening Balance</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="sales_return">Sales Return</SelectItem>
                <SelectItem value="purchase_return">Purchase Return</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setShowCustomDates(v === 'custom'); }}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {showCustomDates && (
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-[160px]"
                />
                <span className="flex items-center text-gray-500">to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[160px]"
                />
              </div>
            )}

            <Button variant="outline" asChild>
              <Link href="/dashboard/pdf/transactions" target="_blank">
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[130px]">Type</TableHead>
                  <TableHead className="w-[120px] text-right">Amount</TableHead>
                  <TableHead className="w-[120px]">Ref No.</TableHead>
                  <TableHead className="w-[120px]">Payment Method</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <CreditCard className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No transactions found</p>
                        <Button asChild className="mt-4">
                          <Link href="/dashboard/ledger/new">Add Transaction</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((txn) => (
                    <TableRow key={txn.id} className="hover:bg-gray-50">
                      <TableCell className="text-sm font-medium">
                        {formatDate(txn.transaction_date)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/customers/${txn.customer_id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {txn.customer_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        <p className="font-medium">{txn.description || '—'}</p>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                          getTypeColor(txn.transaction_type)
                        )}>
                          {getTypeLabel(txn.transaction_type)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={['credit', 'opening', 'adjustment'].includes(txn.transaction_type) ? 'text-red-600' : 'text-green-600'}>
                          {['credit', 'opening', 'adjustment'].includes(txn.transaction_type) ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 font-mono">
                        {txn.reference_number || '—'}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {txn.payment_method?.replace('_', ' ') || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild title="View">
                            <Link href={`/dashboard/customers/${txn.customer_id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Edit">
                            <Link href={`/dashboard/ledger/${txn.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(txn.id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}