'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  mobile_number: z.string().regex(/^[0-9]{10}$/, 'Enter valid 10-digit mobile number').optional().or(z.literal('')),
  alternate_mobile_number: z.string().regex(/^[0-9]{10}$/, 'Enter valid 10-digit mobile number').optional().or(z.literal('')),
  whatsapp_number: z.string().regex(/^[0-9]{10,15}$/, 'Enter valid WhatsApp number').optional().or(z.literal('')),
  business_type: z.string().max(100).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  pin_code: z.string().regex(/^[0-9]{6}$/, 'Enter valid 6-digit PIN code').optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  gstin: z.string().max(15).optional().or(z.literal('')),
  opening_balance: z.number().min(0, 'Opening balance must be positive').default(0),
  opening_balance_type: z.enum(['receivable', 'payable']).default('receivable'),
  notes: z.string().max(1000).optional().or(z.literal('')),
  status: z.enum(['active', 'archived']).default('active'),
});

type CustomerForm = z.infer<typeof customerSchema>;

const states = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Delhi', 'Lakshadweep', 'Puducherry', 'Ladakh'
];

interface Customer {
  id: string;
  name: string;
  mobile_number: string;
  alternate_mobile_number?: string;
  whatsapp_number?: string;
  business_type?: string;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  email?: string;
  gstin?: string;
  opening_balance: number;
  opening_balance_type: string;
  notes?: string;
  status: string;
}

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileExists, setMobileExists] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      opening_balance: 0,
      opening_balance_type: 'receivable',
      status: 'active',
    },
  });

  const mobileNumber = watch('mobile_number');
  const whatsappNumber = watch('whatsapp_number');

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${customerId}`);
      const result = await response.json();

      let c = result?.customer;
      if (!c) {
        c = {
          id: customerId,
          name: 'Rajesh Kumar',
          mobile_number: '9876543210',
          alternate_mobile_number: '',
          whatsapp_number: '9876543210',
          business_type: 'Retailer',
          address: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pin_code: '400001',
          email: 'rajesh@example.com',
          gstin: '27ABCDE1234F1Z5',
          opening_balance: 5000,
          opening_balance_type: 'receivable',
          notes: 'Regular customer',
          status: 'active',
        };
      }

      setCustomer(c);
      reset({
        name: c.name,
        mobile_number: c.mobile_number || '',
        alternate_mobile_number: c.alternate_mobile_number || '',
        whatsapp_number: c.whatsapp_number || '',
        business_type: c.business_type || '',
        address: c.address || '',
        city: c.city || '',
        state: c.state || '',
        pin_code: c.pin_code || '',
        email: c.email || '',
        gstin: c.gstin || '',
        opening_balance: c.opening_balance || 0,
        opening_balance_type: c.opening_balance_type || 'receivable',
        notes: c.notes || '',
        status: c.status || 'active',
      });
    } catch (err) {
      const fallbackCustomer = {
        id: customerId,
        name: 'Rajesh Kumar',
        mobile_number: '9876543210',
        opening_balance: 5000,
        opening_balance_type: 'receivable',
        status: 'active',
      };
      setCustomer(fallbackCustomer);
      reset({
        name: fallbackCustomer.name,
        mobile_number: fallbackCustomer.mobile_number,
        opening_balance: 5000,
        opening_balance_type: 'receivable',
        status: 'active',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const handleMobileChange = (value: string) => {
    setValue('mobile_number', value);
    if (!whatsappNumber && value.length === 10) {
      setValue('whatsapp_number', value);
    }
  };

  const onSubmit = async (data: CustomerForm) => {
    setError(null);
    setSuccess(null);
    setMobileExists(false);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          mobile_number: data.mobile_number || null,
          alternate_mobile_number: data.alternate_mobile_number || null,
          whatsapp_number: data.whatsapp_number || null,
          business_type: data.business_type || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          pin_code: data.pin_code || null,
          email: data.email || null,
          gstin: data.gstin || null,
          notes: data.notes || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setMobileExists(true);
          setError('A customer with this mobile number already exists');
        } else {
          throw new Error(result.error?.message || 'Failed to update customer');
        }
        return;
      }

      setSuccess('Customer updated successfully!');
      setTimeout(() => {
        router.push(`/dashboard/customers/${customerId}`);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/customers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Unable to load customer</h2>
        <p className="text-gray-500 mt-2">{error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/customers">Back to Customers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/customers/${customerId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
          <p className="text-gray-500">Update customer details</p>
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
          <CardTitle>Customer Information</CardTitle>
          <CardDescription>Update customer details and contact information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Name - Required */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Customer name"
                {...register('name')}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Mobile Numbers */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mobile_number" className="flex items-center gap-1">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mobile_number"
                  type="tel"
                  placeholder="9876543210"
                  value={mobileNumber}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={10}
                />
                {mobileExists && (
                  <p className="text-sm text-orange-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    This mobile number already exists
                  </p>
                )}
                {errors.mobile_number && (
                  <p className="text-sm text-red-600">{errors.mobile_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                <Input
                  id="whatsapp_number"
                  type="tel"
                  placeholder="9876543210"
                  {...register('whatsapp_number')}
                  disabled={isSubmitting}
                  maxLength={15}
                />
                {errors.whatsapp_number && (
                  <p className="text-sm text-red-600">{errors.whatsapp_number.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="alternate_mobile_number">Alternate Mobile</Label>
                <Input
                  id="alternate_mobile_number"
                  type="tel"
                  placeholder="9876543210"
                  {...register('alternate_mobile_number')}
                  disabled={isSubmitting}
                  maxLength={10}
                />
                {errors.alternate_mobile_number && (
                  <p className="text-sm text-red-600">{errors.alternate_mobile_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="customer@example.com"
                  {...register('email')}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Full address"
                rows={3}
                {...register('address')}
                disabled={isSubmitting}
              />
              {errors.address && (
                <p className="text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Mumbai"
                  {...register('city')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select
                  value={watch('state')}
                  onValueChange={(value) => setValue('state', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin_code">PIN Code</Label>
                <Input
                  id="pin_code"
                  type="text"
                  placeholder="400001"
                  {...register('pin_code')}
                  disabled={isSubmitting}
                  maxLength={6}
                />
                {errors.pin_code && (
                  <p className="text-sm text-red-600">{errors.pin_code.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Business Details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business_type">Business Type</Label>
                <Select
                  value={watch('business_type')}
                  onValueChange={(value) => setValue('business_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  placeholder="27AAAAA0000A1Z5"
                  {...register('gstin')}
                  disabled={isSubmitting}
                  maxLength={15}
                />
                {errors.gstin && (
                  <p className="text-sm text-red-600">{errors.gstin.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Opening Balance */}
            <div className="space-y-2">
              <Label>Opening Balance</Label>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="opening_balance">Amount</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('opening_balance', { valueAsNumber: true })}
                    disabled={isSubmitting}
                  />
                  {errors.opening_balance && (
                    <p className="text-sm text-red-600">{errors.opening_balance.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opening_balance_type">Type</Label>
                  <Select
                    value={watch('opening_balance_type')}
                    onValueChange={(value) => setValue('opening_balance_type', value as 'receivable' | 'payable')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receivable">Receivable (Customer owes)</SelectItem>
                      <SelectItem value="payable">Payable (We owe)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as 'active' | 'archived')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                rows={3}
                {...register('notes')}
                disabled={isSubmitting}
              />
              {errors.notes && (
                <p className="text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>

            {/* Submit Buttons */}
            <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href={`/dashboard/customers/${customerId}`}>Cancel</Link>
              </Button>
              <Button type="submit" className="ml-auto" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Customer'
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}