'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n';

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

export default function NewCustomerPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileExists, setMobileExists] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      opening_balance: 0,
      opening_balance_type: 'receivable',
    },
  });

  const onInvalid = () => {
    setError('Please check all required fields and fix validation errors before submitting.');
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      setFocus(errorKeys[0] as any);
    }
  };

  const whatsappNumber = watch('whatsapp_number');

  // Auto-fill WhatsApp number from mobile
  const handleMobileChange = (value: string) => {
    setValue('mobile_number', value);
    if (!whatsappNumber && value.length === 10) {
      setValue('whatsapp_number', value);
    }
  };

  const onSubmit = async (data: CustomerForm) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      } catch (e) {
        // Continue without auth header
      }

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers,
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
        } else if (result.error?.details) {
          const detailMsg = Object.entries(result.error.details)
            .map(([field, msg]: any) => `${field}: ${msg}`)
            .join(', ');
          setError(`Validation failed: ${detailMsg}`);
        } else {
          setError(result.error?.message || 'Failed to create customer');
        }
        return;
      }

      setSuccess('Customer created successfully!');
      setTimeout(() => {
        router.push(`/dashboard/customers/${result.customer.id}`);
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/customers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('newCustomer')}</h1>
          <p className="text-gray-500">
            {language === 'hi' ? 'ग्राहक का विवरण भरें' : 'Enter customer details'}
          </p>
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
          <CardTitle>{language === 'hi' ? 'ग्राहक जानकारी' : 'Customer Information'}</CardTitle>
          <CardDescription>
            {language === 'hi' ? 'बुनियादी विवरण एवं संपर्क जानकारी' : 'Basic details and contact information'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            {/* Name - Required */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                {t('fullName')}
              </Label>
              <Input
                id="name"
                placeholder={language === 'hi' ? 'ग्राहक का नाम' : 'Customer name'}
                className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                {...register('name')}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Mobile Numbers */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mobile_number" className="flex items-center gap-1">
                  Mobile Number
                </Label>
                <Input
                  id="mobile_number"
                  type="tel"
                  placeholder="9876543210"
                  className={errors.mobile_number ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  {...register('mobile_number', { onChange: (e) => handleMobileChange(e.target.value) })}
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                  disabled={isLoading}
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
                    disabled={isLoading}
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

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                rows={3}
                {...register('notes')}
                disabled={isLoading}
              />
              {errors.notes && (
                <p className="text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>

            {/* Submit Buttons */}
            <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/customers">{t('cancel')}</Link>
              </Button>
              <Button type="submit" className="ml-auto bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {language === 'hi' ? 'बनाया जा रहा है...' : 'Creating...'}
                  </>
                ) : (
                  t('saveCustomer')
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}