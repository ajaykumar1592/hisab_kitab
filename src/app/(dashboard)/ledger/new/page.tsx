'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const transactionSchema = z.object({
  customer_id: z.string().uuid('Please select a customer'),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  transaction_type: z.enum(['credit', 'debit', 'payment', 'opening', 'adjustment', 'sales_return', 'purchase_return']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(500).optional().or(z.literal('')),
  reference_number: z.string().max(100).optional().or(z.literal('')),
  payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'other']).optional(),
});

type TransactionForm = z.infer<typeof transactionSchema>;

interface Customer {
  id: string;
  name: string;
  mobile_number: string;
  balance: number;
}

export default function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get('customer');
  const prefillType = searchParams.get('type');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: (prefillType || 'credit') as 'credit' | 'debit' | 'payment' | 'opening' | 'adjustment' | 'sales_return' | 'purchase_return',
    } as TransactionForm,
  });

  const transactionType = watch('transaction_type');
  const amount = watch('amount');

  // Fetch customers on load
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await fetch('/api/customers?status=active&limit=100');
      const result = await response.json();

      if (response.ok) {
        setCustomers(result.customers || []);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Pre-fill customer if provided
  useEffect(() => {
    if (prefillCustomerId) {
      setValue('customer_id', prefillCustomerId);
    }
  }, [prefillCustomerId, setValue]);

  const onSubmit = async (data: TransactionForm) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          amount: Number(data.amount),
          reference_number: data.reference_number || null,
          payment_method: data.payment_method || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to create transaction');
      }

      setSuccess('Transaction recorded successfully!');
      setTimeout(() => {
        if (prefillCustomerId) {
          router.push(`/dashboard/customers/${prefillCustomerId}`);
        } else {
          router.push('/dashboard/ledger');
        }
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      credit: 'Credit Sale (Customer owes)',
      debit: 'Debit / Purchase',
      payment: 'Payment Received',
      opening: 'Opening Balance',
      adjustment: 'Adjustment',
      sales_return: 'Sales Return',
      purchase_return: 'Purchase Return',
    };
    return labels[type] || type;
  };

  const getTypeDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      credit: 'Goods sold to customer on credit - increases receivable',
      debit: 'Goods purchased from supplier - increases payable',
      payment: 'Payment received from customer - decreases receivable',
      opening: 'Initial balance for customer/supplier',
      adjustment: 'Manual adjustment to balance',
      sales_return: 'Customer returned goods - decreases receivable',
      purchase_return: 'Returned goods to supplier - decreases payable',
    };
    return descriptions[type] || '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={prefillCustomerId ? `/dashboard/customers/${prefillCustomerId}` : '/dashboard/ledger'}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Transaction</h1>
          <p className="text-gray-500">Record a new transaction</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>Enter the transaction information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer_id" className="flex items-center gap-1">
                Customer <span className="text-red-500">*</span>
              </Label>
              {loadingCustomers ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-500">Loading customers...</span>
                </div>
              ) : (
                <Select
                  value={watch('customer_id')}
                  onValueChange={(value) => setValue('customer_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.name}</span>
                          <span className="text-xs text-gray-500">
                            {customer.mobile_number} • Balance: {customer.balance >= 0 ? '₹' + customer.balance.toLocaleString('en-IN') + ' Dr' : '₹' + Math.abs(customer.balance).toLocaleString('en-IN') + ' Cr'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {customers.length === 0 && (
                      <div className="px-2 py-3 text-center text-gray-500">
                        No customers found. <Link href="/dashboard/customers/new" className="text-blue-600 underline">Add one</Link>
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
              {errors.customer_id && (
                <p className="text-sm text-red-600">{errors.customer_id.message}</p>
              )}
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label htmlFor="transaction_type" className="flex items-center gap-1">
                Transaction Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={transactionType}
                onValueChange={(value) => setValue('transaction_type', value as TransactionForm['transaction_type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credit Sale (Customer owes)</SelectItem>
                  <SelectItem value="debit">Debit / Purchase</SelectItem>
                  <SelectItem value="payment">Payment Received</SelectItem>
                  <SelectItem value="opening">Opening Balance</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="sales_return">Sales Return</SelectItem>
                  <SelectItem value="purchase_return">Purchase Return</SelectItem>
                </SelectContent>
              </Select>
              {transactionType && (
                <p className="text-sm text-gray-500">{getTypeDescription(transactionType)}</p>
              )}
              {errors.transaction_type && (
                <p className="text-sm text-red-600">{errors.transaction_type.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Date <span className="text-red-500">*</span></Label>
              <Input
                id="transaction_date"
                type="date"
                {...register('transaction_date')}
                disabled={isSubmitting}
              />
              {errors.transaction_date && (
                <p className="text-sm text-red-600">{errors.transaction_date.message}</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="flex items-center gap-1">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register('amount', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Transaction description (e.g., 'Sale of 50 cement bags')"
                rows={2}
                {...register('description')}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <Separator />

            {/* Reference & Payment Method */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  placeholder="e.g., INV-001, PY-001"
                  {...register('reference_number')}
                  disabled={isSubmitting}
                />
                {errors.reference_number && (
                  <p className="text-sm text-red-600">{errors.reference_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={watch('payment_method')}
                  onValueChange={(value) => setValue('payment_method', value as TransactionForm['payment_method'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.payment_method && (
                  <p className="text-sm text-red-600">{errors.payment_method.message}</p>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href={prefillCustomerId ? `/dashboard/customers/${prefillCustomerId}` : '/dashboard/ledger'}>Cancel</Link>
              </Button>
              <Button type="submit" className="ml-auto" disabled={isSubmitting || loadingCustomers}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'Record Transaction'
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}