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
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Calculator, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';

const productSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(200),
  item_code: z.string().max(50).optional().or(z.literal('')),
  category_id: z.string().min(1, 'Please select a category'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  rate: z.number().min(0, 'Rate cannot be negative'),
  gst_percentage: z.number().min(0, 'GST cannot be negative').max(100, 'GST cannot exceed 100%'),
  status: z.enum(['active', 'inactive']),
  description: z.string().max(1000).optional().or(z.literal('')),
  hsn_code: z.string().max(20).optional().or(z.literal('')),
});

type ProductForm = z.infer<typeof productSchema>;

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  item_name: string;
  item_code: string;
  category_id: string;
  unit: string;
  quantity: number;
  rate: number;
  gst_percentage: number;
  final_rate: number;
  status: 'active' | 'inactive';
  description: string;
  hsn_code: string;
  created_at: string;
}

const units = [
  'Piece', 'Kg', 'Gram', 'Litre', 'Millilitre', 'Meter', 'Feet',
  'Box', 'Packet', 'Dozen', 'Bag', 'Ton', 'Cubic Feet', 'Square Feet',
  'Roll', 'Set', 'Pair', 'Custom'
];

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { t, isHindi } = useTranslation();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      quantity: 1,
      rate: 0,
      gst_percentage: 18,
      status: 'active',
    },
  });

  const rate = watch('rate') || 0;
  const gstPercentage = watch('gst_percentage') || 0;
  const finalRate = rate + (rate * gstPercentage / 100);

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
    fetchData();
  }, [productId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = await getAuthHeaders();

      const [prodRes, catRes] = await Promise.all([
        fetch(`/api/products/${productId}`, { headers }),
        fetch('/api/categories', { headers }),
      ]);

      if (!prodRes.ok) {
        const errResult = await prodRes.json();
        throw new Error(errResult.error?.message || 'Failed to fetch product');
      }

      const prodResult = await prodRes.json();
      const p = prodResult.product;

      let cats: Category[] = [];
      if (catRes.ok) {
        const catResult = await catRes.json();
        cats = catResult.categories || [];
        setCategories(cats);
      }

      setProduct(p);

      // Clean up description if HSN is inside it
      let cleanDesc = p.description || '';
      if (cleanDesc.includes('HSN:')) {
        cleanDesc = cleanDesc.replace(/\|\s*HSN:\s*[\w\d]+/i, '').replace(/^HSN:\s*[\w\d]+\s*/i, '').trim();
      }

      reset({
        item_name: p.item_name || '',
        item_code: p.item_code || '',
        category_id: p.category_id || (cats.length > 0 ? cats[0].id : ''),
        unit: p.unit || 'Piece',
        quantity: p.quantity ?? 1,
        rate: p.rate ?? 0,
        gst_percentage: p.gst_percentage ?? 18,
        status: p.status || 'active',
        description: cleanDesc,
        hsn_code: p.hsn_code || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = () => {
    setError(isHindi ? 'कृपया सभी आवश्यक फ़ील्ड भरें और त्रुटियों को ठीक करें।' : 'Please check all required fields and fix validation errors before submitting.');
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      setFocus(errorKeys[0] as any);
    }
  };

  const onSubmit = async (data: ProductForm) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...data,
          rate: Number(data.rate),
          quantity: Number(data.quantity),
          gst_percentage: Number(data.gst_percentage),
          item_code: data.item_code || null,
          description: data.description || null,
          hsn_code: data.hsn_code || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.details) {
          const detailMsg = typeof result.error.details === 'string'
            ? result.error.details
            : typeof result.error.details === 'object' && result.error.details !== null
            ? Object.entries(result.error.details)
                .map(([field, msg]: any) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
                .join(', ')
            : JSON.stringify(result.error.details);
          throw new Error(detailMsg || result.error?.message || 'Failed to update product');
        }
        throw new Error(result.error?.message || 'Failed to update product');
      }

      setSuccess(isHindi ? 'उत्पाद विवरण एवं रेट सफलतापूर्वक अपडेट कर दिया गया है!' : 'Product updated successfully!');
      setTimeout(() => {
        router.push('/dashboard/rate-list');
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/rate-list">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('editProductTitle', 'Edit Product')}</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">{isHindi ? 'उत्पाद लोड नहीं हो सका' : 'Unable to load product'}</h2>
        <p className="text-gray-500 mt-2">{error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/rate-list">{isHindi ? 'वापस रेट लिस्ट पर जाएं' : 'Back to Rate List'}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/rate-list">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('editProductTitle', 'Edit Product')}</h1>
          <p className="text-gray-500">{t('editProductSubtitle', 'Update product information and pricing')}</p>
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
          <CardTitle>{t('productInformation', 'Product Information')}</CardTitle>
          <CardDescription>
            {isHindi ? 'उत्पाद का नाम, श्रेणी एवं बुनियादी जानकारी अपडेट करें' : 'Update the product details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            {/* Item Name & Code */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item_name" className="flex items-center gap-1">
                  {t('itemName', 'Item Name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="item_name"
                  placeholder={isHindi ? 'सामग्री का नाम' : 'Product name'}
                  className={errors.item_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  {...register('item_name')}
                  disabled={isSubmitting}
                />
                {errors.item_name && (
                  <p className="text-sm text-red-600">{errors.item_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_code">{t('itemCode', 'Item Code')}</Label>
                <Input
                  id="item_code"
                  placeholder={isHindi ? 'सामग्री कोड' : 'Item code'}
                  className={errors.item_code ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  {...register('item_code')}
                  disabled={isSubmitting}
                />
                {errors.item_code && (
                  <p className="text-sm text-red-600">{errors.item_code.message}</p>
                )}
              </div>
            </div>

            {/* Category & Unit */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category_id" className="flex items-center gap-1">
                  {t('category', 'Category')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('category_id')}
                  onValueChange={(value) => setValue('category_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isHindi ? 'श्रेणी चुनें' : 'Select category'} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && (
                  <p className="text-sm text-red-600">{errors.category_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit" className="flex items-center gap-1">
                  {t('unit', 'Unit')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('unit')}
                  onValueChange={(value) => setValue('unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isHindi ? 'इकाई चुनें' : 'Select unit'} />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-sm text-red-600">{errors.unit.message}</p>
                )}
              </div>
            </div>

            {/* HSN Code */}
            <div className="space-y-2">
              <Label htmlFor="hsn_code">{t('hsnCode', 'HSN / SAC Code')}</Label>
              <Input
                id="hsn_code"
                placeholder={isHindi ? 'उदा. 2523, 7214' : 'e.g., 2523, 7214'}
                {...register('hsn_code')}
                disabled={isSubmitting}
              />
              {errors.hsn_code && (
                <p className="text-sm text-red-600">{errors.hsn_code.message}</p>
              )}
            </div>

            {/* Pricing Section */}
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-600" />
                {t('pricingAndTax', 'Pricing & Tax')}
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="flex items-center gap-1">
                    {t('quantity', 'Default Qty')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="1"
                    min="1"
                    placeholder="1"
                    {...register('quantity', { valueAsNumber: true })}
                    disabled={isSubmitting}
                  />
                  {errors.quantity && (
                    <p className="text-sm text-red-600">{errors.quantity.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate" className="flex items-center gap-1">
                    {t('baseRate', 'Base Rate')} (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('rate', { valueAsNumber: true })}
                    disabled={isSubmitting}
                  />
                  {errors.rate && (
                    <p className="text-sm text-red-600">{errors.rate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gst_percentage" className="flex items-center gap-1">
                    {t('gstRate', 'GST %')} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="gst_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="18"
                    {...register('gst_percentage', { valueAsNumber: true })}
                    disabled={isSubmitting}
                  />
                  {errors.gst_percentage && (
                    <p className="text-sm text-red-600">{errors.gst_percentage.message}</p>
                  )}
                </div>
              </div>

              {/* Final Rate Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-900 font-medium">
                    {t('finalRate', 'Final Rate')} ({isHindi ? 'जीएसटी सहित कुल' : 'incl. GST'}):
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(finalRate)}</p>
                  <p className="text-xs text-blue-600">/ {watch('unit') || 'unit'}</p>
                </div>
              </div>
            </div>

            {/* Status & Description */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status" className="flex items-center gap-1">
                  {t('status', 'Status')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as ProductForm['status'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('active', 'Active')}</SelectItem>
                    <SelectItem value="inactive">{t('inactive', 'Inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('description', 'Description')}</Label>
              <Textarea
                id="description"
                placeholder={isHindi ? 'उत्पाद का विवरण...' : 'Product description, specifications, etc.'}
                rows={3}
                {...register('description')}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Submit Buttons */}
            <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-6 px-0">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/rate-list">{t('cancel', 'Cancel')}</Link>
              </Button>
              <Button type="submit" className="ml-auto" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('savingChanges', 'Saving Changes...')}
                  </>
                ) : (
                  t('updateCustomer', 'Save Changes')
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
