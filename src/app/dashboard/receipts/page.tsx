'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, Download, Eye, Printer, Calendar, MoreVertical, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PaymentReceipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  customer_name: string;
  customer_mobile: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  description: string;
  status: 'issued' | 'cancelled';
  created_at: string;
}

const mockReceipts: PaymentReceipt[] = [
  {
    id: '1',
    receipt_number: 'RCP-2024-001',
    receipt_date: '2024-01-15',
    customer_name: 'Rajesh Kumar',
    customer_mobile: '9876543210',
    amount: 5000,
    payment_method: 'upi',
    reference_number: 'PY-2024-001',
    description: 'Payment for Invoice INV-001',
    status: 'issued',
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    receipt_number: 'RCP-2024-002',
    receipt_date: '2024-01-14',
    customer_name: 'Priya Sharma',
    customer_mobile: '9876543211',
    amount: 15000,
    payment_method: 'bank_transfer',
    reference_number: 'PY-2024-002',
    description: 'Advance payment for order',
    status: 'issued',
    created_at: '2024-01-14T14:20:00Z',
  },
  {
    id: '3',
    receipt_number: 'RCP-2024-003',
    receipt_date: '2024-01-13',
    customer_name: 'Amit Patel',
    customer_mobile: '9876543212',
    amount: 8500,
    payment_method: 'cash',
    reference_number: 'PY-2024-003',
    description: 'Partial payment for steel order',
    status: 'issued',
    created_at: '2024-01-13T11:15:00Z',
  },
  {
    id: '4',
    receipt_number: 'RCP-2024-004',
    receipt_date: '2024-01-12',
    customer_name: 'Vikram Reddy',
    customer_mobile: '9876543213',
    amount: 25000,
    payment_method: 'cheque',
    reference_number: 'PY-2024-004',
    description: 'Full settlement',
    status: 'cancelled',
    created_at: '2024-01-12T09:45:00Z',
  },
];

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('issued');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);

  useEffect(() => {
    setReceipts(mockReceipts);
  }, []);

  const filteredReceipts = receipts
    .filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (methodFilter !== 'all' && r.payment_method !== methodFilter) return false;
      if (search) {
        const query = search.toLowerCase();
        return (
          r.customer_name.toLowerCase().includes(query) ||
          r.receipt_number.toLowerCase().includes(query) ||
          r.reference_number.toLowerCase().includes(query) ||
          r.customer_mobile.includes(query)
        );
      }
      if (dateFilter !== 'all' && dateFilter !== 'custom') {
        const txnDate = new Date(r.receipt_date);
        const now = new Date();
        let start: Date;
        let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        switch (dateFilter) {
          case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'yesterday':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
            break;
          case 'week':
            const day = now.getDay();
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
            break;
          case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'last_month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            break;
          default:
            return true;
        }
        return txnDate >= start && txnDate <= end;
      }
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        const txnDate = new Date(r.receipt_date);
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59);
        return txnDate >= start && txnDate <= end;
      }
      return true;
    })
    .sort((a, b) => new Date(b.receipt_date).getTime() - new Date(a.receipt_date).getTime());

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      upi: 'UPI',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      other: 'Other',
    };
    return labels[method] || method;
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800';
      case 'upi': return 'bg-blue-100 text-blue-800';
      case 'bank_transfer': return 'bg-purple-100 text-purple-800';
      case 'cheque': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totals = {
    issued: filteredReceipts
      .filter(r => r.status === 'issued')
      .reduce((sum, r) => sum + r.amount, 0),
    cancelled: filteredReceipts
      .filter(r => r.status === 'cancelled')
      .reduce((sum, r) => sum + r.amount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Receipts</h1>
          <p className="text-gray-500">Manage and print payment receipts</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/receipts/new">
              <Plus className="mr-2 h-4 w-4" />
              New Receipt
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{filteredReceipts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.issued)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                filteredReceipts
                  .filter(r => {
                    const date = new Date(r.receipt_date);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  })
                  .reduce((sum, r) => sum + r.amount, 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.cancelled)}</div>
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
                placeholder="Search customer, receipt #, ref #, mobile..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setShowCustomDates(v === 'custom'); }}>
              <SelectTrigger className="w-full sm:w-[160px]">
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
                  className="w-[150px]"
                />
                <span className="flex items-center text-gray-500">to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
            )}

            <Button variant="outline" asChild>
              <Link href="/dashboard/pdf/receipts" target="_blank">
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[130px]">Receipt No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="w-[120px]">Method</TableHead>
                  <TableHead className="w-[120px] text-right">Amount</TableHead>
                  <TableHead className="w-[120px]">Ref No.</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <Calendar className="h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No receipts found</p>
                        <Button asChild className="mt-4">
                          <Link href="/dashboard/receipts/new">Create Receipt</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-gray-50">
                      <TableCell className="text-sm font-medium">
                        {formatDate(receipt.receipt_date)}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium text-blue-600">
                        {receipt.receipt_number}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/customers/1`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {receipt.customer_name}
                        </Link>
                        <p className="text-xs text-gray-500">{receipt.customer_mobile}</p>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                          getMethodColor(receipt.payment_method)
                        )}>
                          {getMethodLabel(receipt.payment_method)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(receipt.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 font-mono">
                        {receipt.reference_number}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                          receipt.status === 'issued'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        )}>
                          {receipt.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild title="View/Print">
                            <Link href={`/dashboard/receipts/${receipt.id}`} target="_blank">
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Print">
                            <Link href={`/dashboard/receipts/${receipt.id}/print`} target="_blank">
                              <Printer className="h-4 w-4" />
                            </Link>
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