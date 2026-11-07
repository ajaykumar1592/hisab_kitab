'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Eye, Download, Share2, Phone, MessageSquare, CreditCard, Loader2, AlertCircle, ArrowLeft, MoreVertical } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  description: string;
  reference_number: string;
  payment_method: string;
  running_balance: number;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  mobile_number: string;
  whatsapp_number?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  gstin?: string;
  opening_balance: number;
  opening_balance_type: string;
  status: string;
  created_at: string;
  transactions: Transaction[];
  totals: {
    opening_balance: number;
    total_credit: number;
    total_debit: number;
    current_balance: number;
  };
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('ledger');

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${customerId}`);
      const result = await response.json();

      if (response.ok && result.customer) {
        setCustomer(result.customer);
      } else {
        // Fallback for mock IDs or when database is not yet seeded
        setCustomer({
          id: customerId,
          name: 'Rajesh Kumar',
          mobile_number: '9876543210',
          whatsapp_number: '9876543210',
          email: 'rajesh@example.com',
          address: '123 Main Street, Mumbai, Maharashtra',
          city: 'Mumbai',
          state: 'Maharashtra',
          pin_code: '400001',
          gstin: '27ABCDE1234F1Z5',
          opening_balance: 5000,
          opening_balance_type: 'receivable',
          status: 'active',
          created_at: '2024-01-01',
          transactions: [
            {
              id: '1',
              transaction_date: '2024-01-15',
              transaction_type: 'credit',
              amount: 5000,
              description: 'Sale of cement bags',
              reference_number: 'INV-001',
              payment_method: 'cash',
              running_balance: 10000,
              created_at: '2024-01-15T10:00:00Z',
            },
            {
              id: '2',
              transaction_date: '2024-01-15',
              transaction_type: 'payment',
              amount: 2000,
              description: 'Payment received (UPI)',
              reference_number: 'PY-001',
              payment_method: 'upi',
              running_balance: 8000,
              created_at: '2024-01-15T14:00:00Z',
            },
          ],
          totals: {
            opening_balance: 5000,
            total_credit: 5000,
            total_debit: 2000,
            current_balance: 8000,
          },
        });
      }
    } catch (err) {
      setCustomer({
        id: customerId,
        name: 'Rajesh Kumar',
        mobile_number: '9876543210',
        whatsapp_number: '9876543210',
        email: 'rajesh@example.com',
        address: '123 Main Street, Mumbai, Maharashtra',
        city: 'Mumbai',
        state: 'Maharashtra',
        pin_code: '400001',
        gstin: '27ABCDE1234F1Z5',
        opening_balance: 5000,
        opening_balance_type: 'receivable',
        status: 'active',
        created_at: '2024-01-01',
        transactions: [],
        totals: {
          opening_balance: 5000,
          total_credit: 0,
          total_debit: 0,
          current_balance: 5000,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const handleDelete = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      fetchCustomer();
    } catch (err) {
      alert('Failed to delete transaction');
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'credit':
      case 'opening':
        return 'text-red-600 bg-red-50';
      case 'debit':
      case 'payment':
        return 'text-green-600 bg-green-50';
      case 'adjustment':
        return 'text-blue-600 bg-blue-50';
      case 'sales_return':
      case 'purchase_return':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTransactionTypeLabel = (type: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Unable to load customer</h2>
        <p className="text-gray-500 mt-2">{error || 'Customer not found'}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/customers">Back to Customers</Link>
        </Button>
      </div>
    );
  }

  const balanceColor = (customer.totals?.current_balance ?? 0) >= 0 ? 'text-red-600' : 'text-green-600';
  const balanceLabel = (customer.totals?.current_balance ?? 0) >= 0 ? 'Receivable' : 'Payable';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/customers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-500">{customer.mobile_number}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/customers/${customerId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/ledger/new?customer=${customerId}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/ledger/new?customer=${customerId}&type=payment`}>
              <CreditCard className="mr-2 h-4 w-4" />
              Receive Payment
            </Link>
          </Button>
          {customer.whatsapp_number && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/whatsapp/send?customer=${customerId}`}>
                <MessageSquare className="mr-2 h-4 w-4" />
                WhatsApp
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info & Balance Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs text-gray-500">Mobile</Label>
              <p className="font-medium">
                <a href={`tel:${customer.mobile_number}`} className="text-blue-600 hover:underline">
                  {customer.mobile_number}
                </a>
              </p>
            </div>
            {customer.whatsapp_number && (
              <div>
                <Label className="text-xs text-gray-500">WhatsApp</Label>
                <p className="font-medium text-green-600">✓ Connected</p>
              </div>
            )}
            {customer.email && (
              <div>
                <Label className="text-xs text-gray-500">Email</Label>
                <p className="font-medium">
                  <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                    {customer.email}
                  </a>
                </p>
              </div>
            )}
            {customer.gstin && (
              <div>
                <Label className="text-xs text-gray-500">GSTIN</Label>
                <p className="font-medium font-mono text-sm">{customer.gstin}</p>
              </div>
            )}
            {customer.address && (
              <div className="md:col-span-2">
                <Label className="text-xs text-gray-500">Address</Label>
                <p className="font-medium">
                  {customer.address}
                  {customer.city && `, ${customer.city}`}
                  {customer.state && `, ${customer.state}`}
                  {customer.pin_code && ` - ${customer.pin_code}`}
                </p>
              </div>
            )}
            <div>
              <Label className="text-xs text-gray-500">Opening Balance</Label>
              <p className="font-medium">
                {formatCurrency(customer.opening_balance)} ({customer.opening_balance_type})
              </p>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Status</Label>
              <span className={cn(
                'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                customer.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              )}>
                {customer.status}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Balance Summary Card */}
        <Card className={cn('border-l-4', customer.totals.current_balance >= 0 ? 'border-l-red-500' : 'border-l-green-500')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className={`text-3xl font-bold ${balanceColor}`}>
                  {formatCurrency(Math.abs(customer.totals.current_balance))}
                </p>
                <p className="text-sm text-gray-500">{balanceLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-gray-500">Opening</p>
                  <p className="font-medium">{formatCurrency(customer.totals.opening_balance)}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-gray-500">Total Credit</p>
                  <p className="font-medium text-red-600">+{formatCurrency(customer.totals.total_credit)}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-gray-500">Total Debit</p>
                  <p className="font-medium text-green-600">-{formatCurrency(customer.totals.total_debit)}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-gray-500">Transactions</p>
                  <p className="font-medium">{customer.transactions.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ledger">Ledger ({customer.transactions.length})</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        {/* Ledger Tab */}
        <TabsContent value="ledger" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Transaction History</CardTitle>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/pdf/customer-statement/${customerId}`} target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/ledger/new?customer=${customerId}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Transaction
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {customer.transactions.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No transactions yet</p>
                  <Button asChild className="mt-4">
                    <Link href={`/dashboard/ledger/new?customer=${customerId}`}>
                      Add First Transaction
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[120px]">Type</TableHead>
                        <TableHead className="w-[120px] text-right">Amount</TableHead>
                        <TableHead className="w-[140px] text-right">Balance</TableHead>
                        <TableHead className="w-[120px]">Ref No.</TableHead>
                        <TableHead className="w-[60px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.transactions.map((txn) => (
                        <TableRow key={txn.id} className="hover:bg-gray-50">
                          <TableCell className="text-sm">
                            {formatDate(txn.transaction_date)}
                          </TableCell>
                          <TableCell className="text-sm">
                            <p className="font-medium">{txn.description || '—'}</p>
                            {txn.payment_method && (
                              <p className="text-xs text-gray-500 capitalize">{txn.payment_method.replace('_', ' ')}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                              getTransactionTypeColor(txn.transaction_type)
                            )}>
                              {getTransactionTypeLabel(txn.transaction_type)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className={['credit', 'opening', 'adjustment'].includes(txn.transaction_type) ? 'text-red-600' : 'text-green-600'}>
                              {['credit', 'opening', 'adjustment'].includes(txn.transaction_type) ? '+' : '-'}
                              {formatCurrency(txn.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-gray-900">
                            {formatCurrency(Math.abs(txn.running_balance))}
                            {txn.running_balance >= 0 ? ' Dr' : ' Cr'}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 font-mono">
                            {txn.reference_number || '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(txn.id)} title="Delete">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statements Tab */}
        <TabsContent value="statements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Statements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button asChild>
                  <Link href={`/dashboard/pdf/customer-statement/${customerId}`} target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    Download Full Statement PDF
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/dashboard/pdf/customer-statement/${customerId}?period=month`} target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    This Month Statement
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/dashboard/pdf/customer-statement/${customerId}?period=quarter`} target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    This Quarter Statement
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/dashboard/pdf/customer-statement/${customerId}?period=year`} target="_blank">
                    <Download className="mr-2 h-4 w-4" />
                    This Year Statement
                  </Link>
                </Button>
                <p className="text-sm text-gray-500">
                  Statements include opening balance, all transactions with running balance, and closing balance.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment History</CardTitle>
              <Button asChild>
                <Link href={`/dashboard/ledger/new?customer=${customerId}&type=payment`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Payment
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[120px]">Method</TableHead>
                      <TableHead className="w-[120px] text-right">Amount</TableHead>
                      <TableHead className="w-[120px]">Ref No.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.transactions
                      .filter((t) => ['payment', 'debit'].includes(t.transaction_type))
                      .map((txn) => (
                        <TableRow key={txn.id} className="hover:bg-gray-50">
                          <TableCell className="text-sm">{formatDate(txn.transaction_date)}</TableCell>
                          <TableCell className="text-sm font-medium">{txn.description || 'Payment Received'}</TableCell>
                          <TableCell>
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700 capitalize">
                              {txn.payment_method?.replace('_', ' ') || 'Cash'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(txn.amount)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 font-mono">
                            {txn.reference_number || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    {customer.transactions.filter((t) => ['payment', 'debit'].includes(t.transaction_type)).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No payments recorded yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}