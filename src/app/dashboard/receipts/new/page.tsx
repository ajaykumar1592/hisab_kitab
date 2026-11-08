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
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Users, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const receiptSchema = z.object({
  customer_id: z.string().min(1, 'Please select a customer'),
  receipt_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  amount: z.number().positive('Amount must be positive'),
  payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'other']),
  reference_number: z.string().max(100).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
});

type ReceiptForm = z.infer<typeof receiptSchema>;

interface Customer {
  id: string;
  name: string;
  mobile_number: string;
  balance: number;
}

export default function ReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get('customer');

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
    setFocus,
    formState: { errors },
  } = useForm<ReceiptForm>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      receipt_date: new Date().toISOString().split('T')[0],
    },
  });

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

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const headers = await getAuthHeaders();
      const response = await fetch('/api/customers?status=active&limit=100', { headers });
      if (response.ok) {
        const result = await response.json();
        if (result.customers) {
          setCustomers(result.customers);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (prefillCustomerId) {
      setValue('customer_id', prefillCustomerId);
    }
  }, [prefillCustomerId, setValue]);

  const onInvalid = () => {
    setError('Please check all required fields and fix validation errors before submitting.');
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      setFocus(errorKeys[0] as any);
    }
  };

  const onSubmit = async (data: ReceiptForm) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          amount: Number(data.amount),
          reference_number: data.reference_number || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.details) {
          const detailMsg = Object.entries(result.error.details)
            .map(([field, msg]: any) => `${field}: ${msg}`)
            .join(', ');
          setError(`Validation failed: ${detailMsg}`);
        } else {
          throw new Error(result.error?.message || 'Failed to create receipt');
        }
        return;
      }

      setSuccess(`Receipt ${result.receipt?.receipt_number || 'created'} successfully!`);
      setTimeout(() => {
        router.push('/dashboard/receipts');
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const amount = watch('amount');

  const getBalanceDisplay = (balance: number) => {
    return balance >= 0
      ? `${formatCurrency(balance)} Dr`
      : `${formatCurrency(Math.abs(balance))} Cr`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/receipts">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Payment Receipt</h1>
          <p className="text-gray-500">Record a new payment received</p>
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
          <CardTitle>Receipt Details</CardTitle>
          <CardDescription>Enter the payment receipt information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
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
                  <SelectTrigger className={errors.customer_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.name}</span>
                          <span className="text-xs text-gray-500">
                            {customer.mobile_number} • Balance: {getBalanceDisplay(customer.balance)}
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

            <div className="space-y-2">
              <Label htmlFor="receipt_date">Date <span className="text-red-500">*</span></Label>
              <Input
                id="receipt_date"
                type="date"
                className={errors.receipt_date ? 'border-red-500 focus-visible:ring-red-500' : ''}
                {...register('receipt_date')}
                disabled={isSubmitting}
              />
              {errors.receipt_date && (
                <p className="text-sm text-red-600">{errors.receipt_date.message}</p>
              )}
            </div>

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
                className={errors.amount ? 'border-red-500 focus-visible:ring-red-500' : ''}
                {...register('amount', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              <p className="text-sm text-gray-500">
                Amount in words: <span className="font-medium">{amount > 0 ? `₹${amount.toLocaleString('en-IN')}` : '—'}</span>
              </p>
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method" className="flex items-center gap-1">
                Payment Method <span className="text-red-500">*</span>
              </Label>
              <Select
                value={watch('payment_method')}
                onValueChange={(value) => setValue('payment_method', value as ReceiptForm['payment_method'])}
              >
                <SelectTrigger className={errors.payment_method ? 'border-red-500' : ''}>
                  <SelectValue />
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

            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                placeholder="e.g., PY-2024-001, UPI Ref #"
                className={errors.reference_number ? 'border-red-500' : ''}
                {...register('reference_number')}
                disabled={isSubmitting}
              />
              {errors.reference_number && (
                <p className="text-sm text-red-600">{errors.reference_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Payment description (e.g., 'Payment for Invoice INV-001')"
                rows={2}
                className={errors.description ? 'border-red-500' : ''}
                {...register('description')}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <Separator />

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Receipt Preview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Receipt Date</p>
                  <p className="font-medium">{watch('receipt_date') || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Payment Method</p>
                  <p className="font-medium capitalize">{watch('payment_method') || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="font-medium text-green-600">{amount > 0 ? formatCurrency(amount) : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Reference</p>
                  <p className="font-medium">{watch('reference_number') || '—'}</p>
                </div>
              </div>
            </div>

            <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/receipts">Cancel</Link>
              </Button>
              <Button type="submit" className="ml-auto" disabled={isSubmitting || loadingCustomers}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Receipt'
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}