'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Calendar, Download, CreditCard, Trash2, Edit, Eye, FileText, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  description?: string;
  reference_number?: string;
  payment_method?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_id: string;
  customers?: {
    id?: string;
    name?: string;
    mobile_number?: string;
  };
  items?: Array<{
    id?: string;
    item_name: string;
    quantity: number;
    unit?: string;
  }>;
  running_balance?: number;
}

export default function LedgerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const response = await fetch('/api/transactions?include_items=true&limit=250', { headers });
      if (response.ok) {
        const data = await response.json();
        if (data?.transactions) {
          setTransactions(data.transactions);
        }
      }
    } catch (e) {
      console.error('Failed to load transactions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const getCustomerName = (t: Transaction): string => {
    if (t.customer_name && t.customer_name.trim()) return t.customer_name;
    const cust = Array.isArray(t.customers) ? t.customers[0] : t.customers;
    if (cust?.name && cust.name.trim()) return cust.name;
    return 'Customer';
  };

  const getDescription = (t: Transaction): string => {
    if (t.description && t.description.trim()) return t.description;
    if (t.items && t.items.length > 0) {
      return t.items
        .map(i => `${i.item_name}${i.quantity ? ` (${i.quantity} ${i.unit || 'PCS'})` : ''}`)
        .join(', ');
    }
    if (t.reference_number) {
      const typeLabel = t.transaction_type === 'credit' ? 'Credit Sale' : t.transaction_type === 'payment' ? 'Payment' : 'Ref';
      return `${typeLabel} #${t.reference_number}`;
    }
    const typeLabel = getTypeLabel(t.transaction_type);
    return typeLabel || '—';
  };

  const filteredTransactions = transactions
    .filter((t) => {
      if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
      if (search) {
        const query = search.toLowerCase().trim();
        const custName = getCustomerName(t).toLowerCase();
        const desc = getDescription(t).toLowerCase();
        const ref = (t.reference_number || '').toLowerCase();
        return custName.includes(query) || desc.includes(query) || ref.includes(query);
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
        return 'bg-red-50 text-red-700 border-red-200';
      case 'debit':
      case 'payment':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'adjustment':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'sales_return':
      case 'purchase_return':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      credit: 'Credit Sale',
      debit: 'Debit / Purchase',
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
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
    debit: filteredTransactions
      .filter((t) => ['debit', 'payment', 'sales_return', 'purchase_return'].includes(t.transaction_type))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Khata / Ledger</h1>
          <p className="text-sm font-medium text-slate-600 mt-0.5">All customer transactions, sales, and payments ledger</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:text-blue-600 hover:border-blue-500 shadow-xs font-semibold">
            <Link href="/dashboard/ledger/new">
              <Plus className="mr-1.5 h-4 w-4 text-blue-600" />
              Add Transaction
            </Link>
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold">
            <Link href="/dashboard/ledger/new?type=payment">
              <CreditCard className="mr-1.5 h-4 w-4" />
              Receive Payment
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span>Total Credit</span>
              <ArrowUpRight className="h-4 w-4 text-red-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-red-600">
              {formatCurrency(totals.credit)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Total credit extended to customers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
              <span>Total Debit / Received</span>
              <ArrowDownLeft className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-green-600">
              {formatCurrency(totals.debit)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Payments collected & settled</p>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-l-4 hover:shadow-md transition-shadow",
          totals.credit - totals.debit >= 0 ? "border-l-red-600" : "border-l-green-600"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-slate-600 uppercase tracking-wider">Net Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-extrabold ${totals.credit - totals.debit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(totals.credit - totals.debit))}
              <span className="text-xs font-bold ml-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {totals.credit - totals.debit >= 0 ? 'Dr (To Receive)' : 'Cr (Advance)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Current total market balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by customer name, description, ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-slate-900 font-medium"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px] font-medium text-slate-800">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Credit Sale</SelectItem>
                <SelectItem value="debit">Debit / Purchase</SelectItem>
                <SelectItem value="payment">Payment Received</SelectItem>
                <SelectItem value="opening">Opening Balance</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="sales_return">Sales Return</SelectItem>
                <SelectItem value="purchase_return">Purchase Return</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setShowCustomDates(v === 'custom'); }}>
              <SelectTrigger className="w-full sm:w-[180px] font-medium text-slate-800">
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
                  className="w-[160px] font-medium text-slate-800"
                />
                <span className="flex items-center text-slate-600 font-medium">to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[160px] font-medium text-slate-800"
                />
              </div>
            )}

            <Button variant="outline" asChild className="border-slate-300 text-slate-800 hover:text-slate-900 font-semibold shadow-xs">
              <Link href="/dashboard/pdf/transactions" target="_blank">
                <Download className="mr-2 h-4 w-4 text-blue-600" />
                Export PDF
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="w-[110px] pl-4">Date</TableHead>
                  <TableHead className="min-w-[180px]">Customer</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead className="w-[130px] text-right">Amount</TableHead>
                  <TableHead className="w-[130px]">Ref No.</TableHead>
                  <TableHead className="w-[130px]">Payment Method</TableHead>
                  <TableHead className="w-[110px] text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-sm font-medium text-slate-600">Loading ledger transactions...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center">
                        <CreditCard className="h-12 w-12 text-slate-300 mb-3" />
                        <p className="text-base font-semibold text-slate-800">No transactions found</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm">No ledger entries match your filter criteria or no transactions recorded yet.</p>
                        <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                          <Link href="/dashboard/ledger/new">
                            <Plus className="mr-1.5 h-4 w-4" /> Add Transaction
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((txn) => {
                    const custName = getCustomerName(txn);
                    const itemDesc = getDescription(txn);
                    const isCredit = ['credit', 'opening', 'adjustment'].includes(txn.transaction_type);

                    return (
                      <TableRow key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                        <TableCell className="pl-4 text-sm font-semibold text-slate-800 whitespace-nowrap">
                          {formatDate(txn.transaction_date)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/customers/${txn.customer_id}`}
                            className="group inline-flex items-center gap-2"
                          >
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              {custName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-sm truncate max-w-[160px]">
                                {custName}
                              </p>
                              {txn.customer_mobile && (
                                <p className="text-[11px] text-slate-500 font-normal">{txn.customer_mobile}</p>
                              )}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-[240px]">
                          <p className="font-medium text-slate-800 text-sm truncate" title={itemDesc}>
                            {itemDesc}
                          </p>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border',
                            getTypeColor(txn.transaction_type)
                          )}>
                            {getTypeLabel(txn.transaction_type)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm whitespace-nowrap">
                          <span className={isCredit ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                            {isCredit ? '+' : '-'}
                            {formatCurrency(txn.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-mono font-medium text-slate-700">
                          {txn.reference_number ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">
                              {txn.reference_number}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-800 capitalize">
                          {txn.payment_method ? (
                            <span className="inline-flex items-center gap-1.5">
                              <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                              <span>{txn.payment_method.replace('_', ' ')}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                              asChild
                              title="View Customer"
                            >
                              <Link href={`/dashboard/customers/${txn.customer_id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                              asChild
                              title="Edit Transaction"
                            >
                              <Link href={`/dashboard/ledger/${txn.id}/edit`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            {['credit', 'debit', 'sales_return', 'purchase_return'].includes(txn.transaction_type) && (
                              <a
                                href={`/api/transactions/${txn.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                                title="Download / Print Invoice"
                              >
                                <FileText className="h-4 w-4" />
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(txn.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Delete Transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
