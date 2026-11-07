'use client';

import { useState, useEffect } from 'react';
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
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Calculator, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

const units = [
  'Piece', 'Kg', 'Gram', 'Litre', 'Millilitre', 'Meter', 'Feet',
  'Box', 'Packet', 'Dozen', 'Bag', 'Ton', 'Cubic Feet', 'Square Feet',
  'Roll', 'Set', 'Pair', 'Custom'
];

const mockCategories: Category[] = [
  { id: '1', name: 'Building Materials' },
  { id: '2', name: 'Construction Materials' },
  { id: '3', name: 'Plumbing' },
  { id: '4', name: 'Electrical' },
  { id: '5', name: 'Paint & Hardware' },
];

export default function NewProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
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
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      quantity: 1,
      rate: 0,
      gst_percentage: 18,
      status: 'active',
    },
  });

  const onInvalid = () => {
    setError('Please check all required fields and fix validation errors before submitting.');
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      setFocus(errorKeys[0] as any);
    }
  };

  const rate = watch('rate');
  const gstPercentage = watch('gst_percentage');
  const quantity = watch('quantity');
  const finalRate = rate + (rate * gstPercentage / 100);

  // Fetch categories on load
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await fetch('/api/categories');
      if (response.ok) {
        const result = await response.json();
        if (result.categories && result.categories.length > 0) {
          setCategories(result.categories);
          if (!watch('category_id')) {
            setValue('category_id', result.categories[0].id);
          }
          setLoadingCategories(false);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Auto-generate item code from name
  const itemName = watch('item_name');
  useEffect(() => {
    if (itemName && !watch('item_code')) {
      const code = itemName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 8);
      setValue('item_code', `${code}-${Date.now().toString().slice(-4)}`);
    }
  }, [itemName, setValue]);

  const onSubmit = async (data: ProductForm) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          const detailMsg = Object.entries(result.error.details)
            .map(([field, msg]: any) => `${field}: ${msg}`)
            .join(', ');
          throw new Error(`Validation failed: ${detailMsg}`);
        }
        throw new Error(result.error?.message || 'Failed to create product');
      }

      setSuccess('Product created successfully!');
      setTimeout(() => {
        router.push('/dashboard/rate-list');
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Add New Item</h1>
          <p className="text-gray-500">Create a new product in your rate list</p>
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
          <CardTitle>Product Information</CardTitle>
          <CardDescription>Enter the product details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            {/* Item Name & Code */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item_name" className="flex items-center gap-1">
                  Item Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="item_name"
                  placeholder="e.g., Cement OPC 53 Grade"
                  className={errors.item_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  {...register('item_name')}
                  disabled={isSubmitting}
                />
                {errors.item_name && (
                  <p className="text-sm text-red-600">{errors.item_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_code">Item Code</Label>
                <Input
                  id="item_code"
                  placeholder="Auto-generated from name"
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
                  Category <span className="text-red-500">*</span>
                </Label>
                {loadingCategories ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-500">Loading categories...</span>
                  </div>
                ) : (
                  <Select
                    value={watch('category_id')}
                    onValueChange={(value) => setValue('category_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                      {categories.length === 0 && (
                        <div className="px-2 py-3 text-center text-gray-500">
                          No categories found. <Link href="/dashboard/settings/categories" className="text-blue-600 underline">Add one</Link>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {errors.category_id && (
                  <p className="text-sm text-red-600">{errors.category_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit" className="flex items-center gap-1">
                  Unit <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('unit')}
                  onValueChange={(value) => setValue('unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
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
              <Label htmlFor="hsn_code">HSN Code</Label>
              <Input
                id="hsn_code"
                placeholder="e.g., 2523, 7214"
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
                Pricing
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="flex items-center gap-1">
                    Default Qty <span className="text-red-500">*</span>
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
                    Base Rate <span className="text-red-500">*</span>
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
                    GST % <span className="text-red-500">*</span>
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
              <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-gray-500" />
                  <span className="text-gray-600">Final Rate (incl. GST):</span>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(finalRate)}</p>
                  <p className="text-xs text-gray-500">per {watch('unit') || 'unit'}</p>
                </div>
              </div>
            </div>

            {/* Status & Description */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status" className="flex items-center gap-1">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as ProductForm['status'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Product description, specifications, etc."
                rows={3}
                {...register('description')}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Submit Buttons */}
            <CardFooter className="flex flex-col sm:flex-row gap-4 border-t pt-6">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/rate-list">Cancel</Link>
              </Button>
              <Button type="submit" className="ml-auto" disabled={isSubmitting || loadingCategories}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Product'
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}