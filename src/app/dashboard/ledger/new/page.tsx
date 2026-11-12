'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  RefreshCw,
  Plus,
  Trash2,
  Package,
  Calculator,
  Tag,
  Minus,
  GripVertical,
  X,
  Edit2,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n';
import { ProductSearchSelect } from '@/components/products/product-search-select';

// Product/Material type from Rate List
interface Product {
  id: string;
  item_name: string;
  item_code: string | null;
  category?: string;
  category_id?: string;
  unit: string;
  quantity?: number;
  rate: number;
  gst_percentage: number;
  final_rate?: number;
  status: string;
  hsn_code?: string;
  description?: string;
}

interface Customer {
  id: string;
  name: string;
  mobile_number: string;
  balance: number;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  gstin?: string;
}

// Transaction item form schema
const transactionItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  item_name: z.string().min(1, 'Item name is required').max(255),
  item_code: z.string().max(50).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  unit: z.string().min(1, 'Unit is required').max(50),
  quantity: z.number().positive('Quantity must be positive').min(0.001),
  rate: z.number().min(0, 'Rate must be positive'),
  gst_percentage: z.number().min(0).max(100).default(0),
  discount_type: z.enum(['none', 'percentage', 'fixed']).default('none'),
  discount_value: z.number().min(0).default(0),
  sort_order: z.number().default(0),
});

const transactionSchema = z.object({
  customer_id: z.string().min(1, 'Please select a customer'),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  transaction_type: z.enum(['credit', 'debit', 'payment', 'opening', 'adjustment', 'sales_return', 'purchase_return']),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(500).optional().or(z.literal('')),
  reference_number: z.string().max(100).optional().or(z.literal('')),
  payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'other']).optional(),
  discount_type: z.enum(['none', 'percentage', 'fixed']).default('none'),
  discount_value: z.number().min(0).default(0),
  items: z.array(transactionItemSchema).min(1, 'At least one item is required for material transactions'),
});

type TransactionForm = z.infer<typeof transactionSchema>;
type TransactionItemForm = z.infer<typeof transactionItemSchema>;

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

const getTypeDescription = (type: string, t: (key: string) => string) => {
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

const discountTypeLabels = {
  none: 'No Discount',
  percentage: 'Percentage (%)',
  fixed: 'Fixed Amount (₹)',
};

const unitOptions = ['PCS', 'MTR', 'KG', 'BAG', 'BOX', 'SET', 'ROLL', 'LTR', 'SQFT', 'CFT', 'NOS'];

// Material form schema (for modal)
const materialSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(255),
  item_code: z.string().max(50).optional().nullable(),
  category_id: z.string().optional().nullable().or(z.literal('')),
  description: z.string().max(1000).optional().nullable(),
  unit: z.string().min(1, 'Unit is required').max(50),
  quantity: z.number().positive().min(0.001).default(1),
  rate: z.number().min(0, 'Rate must be positive'),
  gst_percentage: z.number().min(0).max(100).default(0),
  hsn_code: z.string().max(50).optional().nullable(),
});

type MaterialForm = z.infer<typeof materialSchema>;

export default function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useTranslation();
  const prefillCustomerId = searchParams.get('customer');
  const prefillType = searchParams.get('type');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{id: string; name: string}[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refNumberLoading, setRefNumberLoading] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [materialFormError, setMaterialFormError] = useState<string | null>(null);
  const [materialFormSubmitting, setMaterialFormSubmitting] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [newMaterialInitialName, setNewMaterialInitialName] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setFocus,
    control,
    formState: { errors },
    reset,
  } = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      customer_id: '',
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: (prefillType || 'credit') as TransactionForm['transaction_type'],
      amount: 0,
      description: '',
      reference_number: '',
      payment_method: 'cash',
      discount_type: 'none',
      discount_value: 0,
      items: [
        {
          product_id: null,
          item_name: '',
          item_code: null,
          description: null,
          unit: 'PCS',
          quantity: 1,
          rate: 0,
          gst_percentage: 0,
          discount_type: 'none',
          discount_value: 0,
          sort_order: 0,
        },
      ],
    },
  });

  const { fields: items, append, remove, move, swap } = useFieldArray({
    control,
    name: 'items',
  });

  const getAuthHeaders = useCallback(async () => {
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
  }, []);

  const fetchNextReferenceNumber = useCallback(async (type: string = 'invoice') => {
    setRefNumberLoading(true);
    try {
      const headers = await getAuthHeaders();
      const refType = (type === 'payment') ? 'receipt' : 'invoice';
      const response = await fetch(`/api/transactions/next-ref?type=${refType}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.reference_number) {
          setValue('reference_number', data.reference_number);
        }
      }
    } catch (err) {
      console.warn('Could not fetch next reference number', err);
    } finally {
      setRefNumberLoading(false);
    }
  }, [getAuthHeaders, setValue]);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchCategories();
    fetchNextReferenceNumber(prefillType || 'credit');
  }, [fetchNextReferenceNumber, prefillType]);

  useEffect(() => {
    if (prefillCustomerId) {
      setValue('customer_id', prefillCustomerId);
    }
  }, [prefillCustomerId, setValue]);

  useEffect(() => {
    if (watch('transaction_type')) {
      fetchNextReferenceNumber(watch('transaction_type'));
    }
  }, [watch('transaction_type'), fetchNextReferenceNumber]);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const headers = await getAuthHeaders();
      const response = await fetch('/api/customers?status=active&limit=500', { headers });
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

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const headers = await getAuthHeaders();
      const response = await fetch('/api/products?status=active&limit=500', { headers });
      if (response.ok) {
        const result = await response.json();
        if (result.products) {
          setProducts(result.products.filter((p: Product) => p.status === 'active'));
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const headers = await getAuthHeaders();
      const response = await fetch('/api/categories', { headers });
      if (response.ok) {
        const result = await response.json();
        if (result.categories) {
          setCategories(result.categories);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Calculate line totals
  const calculateLineTotals = (item: any) => {
    const qty = typeof item?.quantity === 'number' ? item.quantity : parseFloat(item?.quantity) || 0;
    const rate = typeof item?.rate === 'number' ? item.rate : parseFloat(item?.rate) || 0;
    const lineSubtotal = qty * rate;
    let discountAmount = 0;

    const discVal = typeof item?.discount_value === 'number' ? item.discount_value : parseFloat(item?.discount_value) || 0;
    if (item?.discount_type === 'percentage') {
      discountAmount = (lineSubtotal * discVal) / 100;
    } else if (item?.discount_type === 'fixed') {
      discountAmount = discVal;
    }

    const taxableAmount = Math.max(0, lineSubtotal - discountAmount);
    const gstPct = typeof item?.gst_percentage === 'number' ? item.gst_percentage : parseFloat(item?.gst_percentage) || 0;
    const gstAmount = (taxableAmount * gstPct) / 100;
    const lineTotal = taxableAmount + gstAmount;

    return { lineSubtotal, discountAmount, taxableAmount, gstAmount, lineTotal };
  };

  // Calculate transaction totals
  const watchedItems = watch('items') || [];
  const watchedDiscountType = watch('discount_type') || 'none';
  const watchedDiscountValue = watch('discount_value') || 0;

  const transactionTotals = watchedItems.reduce((acc, item) => {
    const totals = calculateLineTotals(item);
    acc.subtotal += totals.lineSubtotal;
    acc.discountAmount += totals.discountAmount;
    acc.taxableAmount += totals.taxableAmount;
    acc.totalGst += totals.gstAmount;
    acc.grandTotal += totals.lineTotal;
    return acc;
  }, { subtotal: 0, discountAmount: 0, taxableAmount: 0, totalGst: 0, grandTotal: 0 });

  // Apply transaction-level discount
  let finalDiscountAmount = transactionTotals.discountAmount;
  let finalTaxableAmount = transactionTotals.taxableAmount;
  let finalTotalGst = transactionTotals.totalGst;
  let finalGrandTotal = transactionTotals.grandTotal;

  if (watchedDiscountType !== 'none' && watchedDiscountValue > 0 && transactionTotals.taxableAmount > 0) {
    if (watchedDiscountType === 'percentage') {
      const txnDiscount = (transactionTotals.taxableAmount * watchedDiscountValue) / 100;
      finalDiscountAmount += txnDiscount;
      finalTaxableAmount -= txnDiscount;
      finalTotalGst = (finalTaxableAmount * transactionTotals.totalGst) / transactionTotals.taxableAmount;
      finalGrandTotal = finalTaxableAmount + finalTotalGst;
    } else if (watchedDiscountType === 'fixed') {
      finalDiscountAmount += watchedDiscountValue;
      finalTaxableAmount -= watchedDiscountValue;
      finalTotalGst = (finalTaxableAmount * transactionTotals.totalGst) / transactionTotals.taxableAmount;
      finalGrandTotal = finalTaxableAmount + finalTotalGst;
    }
  }

  const transactionType = watch('transaction_type');
  const isMaterialTransaction = ['credit', 'debit', 'sales_return', 'purchase_return'].includes(transactionType);

  const onInvalid = () => {
    setError('Please check all required fields and fix validation errors before submitting.');
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      setFocus(errorKeys[0] as any);
    }
  };

  const handleProductSelect = (index: number, product: Product) => {
    setValue(`items.${index}.product_id`, product.id, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setValue(`items.${index}.item_name`, product.item_name, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setValue(`items.${index}.item_code`, product.item_code || '', { shouldDirty: true, shouldTouch: true });
    setValue(`items.${index}.unit`, product.unit, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setValue(`items.${index}.rate`, Number(product.rate) || 0, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    setValue(`items.${index}.gst_percentage`, Number(product.gst_percentage) || 0, { shouldDirty: true, shouldTouch: true });
    setValue(`items.${index}.description`, product.description || '', { shouldDirty: true, shouldTouch: true });
    // Default quantity to 1 if not set or <= 0
    const currentQty = watch(`items.${index}.quantity`);
    if (!currentQty || currentQty <= 0) {
      setValue(`items.${index}.quantity`, 1, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
  };

  const handleAddItem = () => {
    append({
      item_name: '',
      unit: 'PCS',
      quantity: 1,
      rate: 0,
      gst_percentage: 0,
      discount_type: 'none',
      discount_value: 0,
      sort_order: items.length,
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('At least one item is required');
      return;
    }
    remove(index);
    // Re-order sort_order
    items.forEach((_, i) => {
      if (i !== index) {
        setValue(`items.${i > index ? i - 1 : i}.sort_order`, i > index ? i - 1 : i);
      }
    });
  };

  const handleMoveItem = (fromIndex: number, toIndex: number) => {
    move(fromIndex, toIndex);
    // Update sort_order after move
    items.forEach((_, i) => {
      setValue(`items.${i}.sort_order`, i);
    });
  };

  const openAddMaterialModal = (searchTerm: string = '', itemIndex?: number) => {
    setNewMaterialInitialName(searchTerm);
    if (typeof itemIndex === 'number') {
      setSelectedItemIndex(itemIndex);
    } else {
      const emptyIdx = items.findIndex((_, idx) => !watch(`items.${idx}.item_name`));
      setSelectedItemIndex(emptyIdx >= 0 ? emptyIdx : items.length);
    }
    setShowAddMaterialModal(true);
  };

  const handleMaterialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMaterialFormError(null);

    const formData = new FormData(e.currentTarget);
    const materialData = {
      item_name: (formData.get('item_name') as string) || newMaterialInitialName || '',
      item_code: (formData.get('item_code') as string) || null,
      category_id: (formData.get('category_id') as string) || null,
      description: (formData.get('description') as string) || '',
      unit: (formData.get('unit') as string) || 'PCS',
      quantity: parseFloat(formData.get('quantity') as string) || 1,
      rate: parseFloat(formData.get('rate') as string) || 0,
      gst_percentage: parseFloat(formData.get('gst_percentage') as string) || 0,
      hsn_code: (formData.get('hsn_code') as string) || '',
      status: 'active',
    };

    // Validate with material schema
    const validation = materialSchema.safeParse(materialData);
    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0];
      setMaterialFormError(firstError || 'Validation failed');
      return;
    }

    setMaterialFormSubmitting(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(materialData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Failed to create material');
      }

      const data = await response.json();
      const newProduct = data.product;

      // Add to products list
      setProducts(prev => [...prev, newProduct]);

      // Select this product in the target item row or append new row
      if (selectedItemIndex !== null && selectedItemIndex < items.length) {
        handleProductSelect(selectedItemIndex, newProduct);
      } else {
        append({
          item_name: newProduct.item_name,
          product_id: newProduct.id,
          item_code: newProduct.item_code || '',
          unit: newProduct.unit,
          quantity: 1,
          rate: Number(newProduct.rate) || 0,
          gst_percentage: Number(newProduct.gst_percentage) || 0,
          discount_type: 'none',
          discount_value: 0,
          sort_order: items.length,
        });
      }

      setShowAddMaterialModal(false);
      setNewMaterialInitialName('');
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setMaterialFormError(err.message || 'Error creating material');
    } finally {
      setMaterialFormSubmitting(false);
    }
  };

  const fetchCategoriesForModal = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/categories', { headers });
      if (response.ok) {
        const data = await response.json();
        return data.categories || [];
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
    return [];
  };

  const onSubmit = async (data: TransactionForm) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          amount: finalGrandTotal || data.amount,
          reference_number: data.reference_number || null,
          payment_method: data.payment_method || null,
          items: data.items?.map(item => ({
            ...item,
            item_code: item.item_code || null,
            description: item.description || null,
          })),
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
          throw new Error(result.error?.message || 'Failed to create transaction');
        }
        return;
      }

      const typeName = getTypeLabel(transactionType);
      setSuccess(`${typeName} recorded successfully!`);

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

  // Render item row
  const renderItemRow = (item: any, index: number) => {
    const currentItem = watchedItems[index] || item;
    const totals = calculateLineTotals(currentItem);

    return (
      <TableRow key={item.id || index} className="hover:bg-gray-50">
        <TableCell className="w-10 text-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (index > 0) handleMoveItem(index, index - 1);
            }}
            disabled={index === 0}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            title="Move up"
          >
            <Minus className="h-3 w-3 rotate-90" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (index < items.length - 1) handleMoveItem(index, index + 1);
            }}
            disabled={index === items.length - 1}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            title="Move down"
          >
            <Minus className="h-3 w-3" />
          </Button>
        </TableCell>
        <TableCell className="min-w-[220px]">
          <Controller
            name={`items.${index}.item_name`}
            control={control}
            rules={{ required: 'Item name is required' }}
            render={({ field }) => (
              <ProductSearchSelect
                products={products}
                value={field.value || ''}
                onSelectProduct={(product) => handleProductSelect(index, product)}
                onChangeManual={(val) => field.onChange(val)}
                onAddNewMaterial={(searchTerm) => openAddMaterialModal(searchTerm, index)}
                disabled={isSubmitting}
                placeholder="Search material or type name..."
              />
            )}
          />
          {errors.items?.[index]?.item_name && (
            <p className="text-xs text-red-600 mt-1">{errors.items[index].item_name.message}</p>
          )}
        </TableCell>
        <TableCell className="w-32">
          <Controller
            name={`items.${index}.unit`}
            control={control}
            rules={{ required: 'Unit is required' }}
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </TableCell>
        <TableCell className="w-24">
          <Controller
            name={`items.${index}.quantity`}
            control={control}
            rules={{ required: 'Quantity is required', min: { value: 0.001, message: 'Qty > 0' } }}
            render={({ field }) => (
              <Input
                type="number"
                step="any"
                min="0.001"
                className="text-right"
                {...field}
                onBlur={field.onBlur}
                disabled={isSubmitting}
                value={field.value !== undefined && field.value !== null ? field.value : ''}
                onChange={e => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value) || 0;
                  field.onChange(val);
                }}
                onKeyUp={e => {
                  const target = e.target as HTMLInputElement;
                  const val = target.value === '' ? 0 : parseFloat(target.value) || 0;
                  setValue(`items.${index}.quantity`, val);
                }}
              />
            )}
          />
        </TableCell>
        <TableCell className="w-28">
          <Controller
            name={`items.${index}.rate`}
            control={control}
            rules={{ required: 'Rate is required', min: { value: 0, message: 'Rate ≥ 0' } }}
            render={({ field }) => (
              <Input
                type="number"
                step="any"
                min="0"
                className="text-right"
                {...field}
                onBlur={field.onBlur}
                disabled={isSubmitting}
                value={field.value !== undefined && field.value !== null ? field.value : ''}
                onChange={e => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value) || 0;
                  field.onChange(val);
                }}
                onKeyUp={e => {
                  const target = e.target as HTMLInputElement;
                  const val = target.value === '' ? 0 : parseFloat(target.value) || 0;
                  setValue(`items.${index}.rate`, val);
                }}
              />
            )}
          />
        </TableCell>
        <TableCell className="w-24">
          <Controller
            name={`items.${index}.gst_percentage`}
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                step="any"
                min="0"
                max="100"
                className="text-right"
                {...field}
                onBlur={field.onBlur}
                disabled={isSubmitting}
                value={field.value !== undefined && field.value !== null ? field.value : ''}
                onChange={e => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value) || 0;
                  field.onChange(val);
                }}
                onKeyUp={e => {
                  const target = e.target as HTMLInputElement;
                  const val = target.value === '' ? 0 : parseFloat(target.value) || 0;
                  setValue(`items.${index}.gst_percentage`, val);
                }}
              />
            )}
          />
        </TableCell>
        <TableCell className="w-36">
          <Controller
            name={`items.${index}.discount_type`}
            control={control}
            render={({ field }) => (
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Disc." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">₹</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </TableCell>
        <TableCell className="w-24">
          <Controller
            name={`items.${index}.discount_value`}
            control={control}
            render={({ field }) => (
              <Input
                type="number"
                step="any"
                min="0"
                max={currentItem?.discount_type === 'percentage' ? 100 : undefined}
                className="text-right"
                {...field}
                onBlur={field.onBlur}
                disabled={isSubmitting || currentItem?.discount_type === 'none'}
                value={field.value !== undefined && field.value !== null ? field.value : ''}
                onChange={e => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value) || 0;
                  field.onChange(val);
                }}
                onKeyUp={e => {
                  const target = e.target as HTMLInputElement;
                  const val = target.value === '' ? 0 : parseFloat(target.value) || 0;
                  setValue(`items.${index}.discount_value`, val);
                }}
              />
            )}
          />
        </TableCell>
        <TableCell className="w-32 font-mono text-right font-medium">
          {formatCurrency(totals.lineTotal)}
        </TableCell>
        <TableCell className="w-10 text-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleRemoveItem(index)}
            disabled={items.length <= 1 || isSubmitting}
            className="text-red-500 hover:text-red-700 h-6 w-6"
            title="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={prefillCustomerId ? `/dashboard/customers/${prefillCustomerId}` : '/dashboard/ledger'}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('addTransaction') || 'Add Transaction'}</h1>
          <p className="text-gray-500">{isMaterialTransaction ? 'Create material-based transaction with Rate List items' : 'Record a simple transaction'}</p>
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
          <CardDescription>Enter transaction information and materials</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
            {/* Customer & Type Row */}
            <div className="grid gap-4 md:grid-cols-2">
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
                  <Controller
                    name="customer_id"
                    control={control}
                    rules={{ required: 'Please select a customer' }}
                    render={({ field }) => (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger className={errors.customer_id ? 'border-red-500' : ''}>
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
                  />
                )}
                {errors.customer_id && <p className="text-sm text-red-600">{errors.customer_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_type" className="flex items-center gap-1">
                  Transaction Type <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="transaction_type"
                  control={control}
                  rules={{ required: 'Transaction type is required' }}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.transaction_type ? 'border-red-500' : ''}>
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
                  )}
                />
                {transactionType && (
                  <p className="text-sm text-gray-500">{getTypeDescription(transactionType, t)}</p>
                )}
                {errors.transaction_type && <p className="text-sm text-red-600">{errors.transaction_type.message}</p>}
              </div>
            </div>

            {/* Date & Reference */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="transaction_date">Date <span className="text-red-500">*</span></Label>
                <Controller
                  name="transaction_date"
                  control={control}
                  rules={{ required: 'Date is required' }}
                  render={({ field }) => (
                    <Input
                      id="transaction_date"
                      type="date"
                      className={errors.transaction_date ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      {...field}
                      disabled={isSubmitting}
                    />
                  )}
                />
                {errors.transaction_date && <p className="text-sm text-red-600">{errors.transaction_date.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reference_number">Reference / Invoice Number</Label>
                  <button
                    type="button"
                    onClick={() => fetchNextReferenceNumber(transactionType)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                    disabled={refNumberLoading || isSubmitting}
                    title="Generate next number"
                  >
                    <RefreshCw className={`h-3 w-3 ${refNumberLoading ? 'animate-spin' : ''}`} />
                    Auto-generate
                  </button>
                </div>
                <div className="relative">
                  <Controller
                    name="reference_number"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="reference_number"
                        placeholder={refNumberLoading ? 'Generating...' : 'e.g., INV-2026-001'}
                        className={errors.reference_number ? 'border-red-500' : ''}
                        {...field}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                  {refNumberLoading && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
                {errors.reference_number && <p className="text-sm text-red-600">{errors.reference_number.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Controller
                  name="payment_method"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.payment_method ? 'border-red-500' : ''}>
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
                  )}
                />
                {errors.payment_method && <p className="text-sm text-red-600">{errors.payment_method.message}</p>}
              </div>
            </div>

            <Separator />

            {/* Material/Items Section */}
            {isMaterialTransaction ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Materials / Items</h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    disabled={isSubmitting}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-10 text-center">#</TableHead>
                        <TableHead className="min-w-[200px]">
                          Item Name <Button variant="ghost" size="icon" onClick={() => openAddMaterialModal()} className="ml-1 h-6 w-6 p-0" title="Add New Material"><Plus className="h-3 w-3" /></Button>
                        </TableHead>
                        <TableHead className="w-32">Unit</TableHead>
                        <TableHead className="w-24 text-right">Qty</TableHead>
                        <TableHead className="w-28 text-right">Rate</TableHead>
                        <TableHead className="w-24 text-right">GST%</TableHead>
                        <TableHead className="w-36">Disc.</TableHead>
                        <TableHead className="w-24 text-right">Disc. Val</TableHead>
                        <TableHead className="w-32 text-right">Total</TableHead>
                        <TableHead className="w-10 text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => renderItemRow(item, index))}
                    </TableBody>
                  </Table>
                </div>

                {/* Add New Material Link */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openAddMaterialModal()}
                    disabled={isSubmitting}
                    className="gap-1.5 text-blue-600 border-dashed border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ Add Manual Material (Save to Rate List)</span>
                  </Button>
                </div>
              </div>
            ) : (
              // Simple amount field for non-material transactions
              <div className="space-y-2">
                <Label htmlFor="amount" className="flex items-center gap-1">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Controller
                  name="amount"
                  control={control}
                  rules={{ required: 'Amount is required', min: { value: 0.01, message: 'Amount must be positive' } }}
                  render={({ field }) => (
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      className={errors.amount ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      {...field}
                      onBlur={field.onBlur}
                      disabled={isSubmitting}
                      value={field.value !== undefined && field.value !== null ? field.value : ''}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
                {errors.amount && <p className="text-sm text-red-600">{errors.amount.message}</p>}
              </div>
            )}

            {/* Transaction-level Discount (only for material transactions) */}
            {isMaterialTransaction && (
              <div className="space-y-4 border-t pt-6">
                <h4 className="font-medium text-gray-900">Additional Discount (on entire transaction)</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="discount_type">Discount Type</Label>
                    <Controller
                      name="discount_type"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Discount</SelectItem>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_value">Discount Value</Label>
                    <Controller
                      name="discount_value"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="discount_value"
                          type="number"
                          step="0.01"
                          min="0"
                          max={watchedDiscountType === 'percentage' ? 100 : undefined}
                          className="text-right"
                          {...field}
                          onBlur={field.onBlur}
                          disabled={isSubmitting || watchedDiscountType === 'none'}
                          value={field.value !== undefined && field.value !== null ? field.value : ''}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="description"
                    placeholder={isMaterialTransaction ? 'e.g., Sale of construction materials - Cement, Steel, Sand' : 'Transaction description'}
                    rows={2}
                    className={errors.description ? 'border-red-500' : ''}
                    {...field}
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
            </div>

            {/* Totals Summary */}
            {isMaterialTransaction && (
              <Card className="bg-gray-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <p className="text-xs text-gray-500">Subtotal</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(transactionTotals.subtotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Item Discounts</p>
                      <p className="font-semibold text-red-600">-{formatCurrency(transactionTotals.discountAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Taxable Amount</p>
                      <p className="font-semibold text-gray-900">{formatCurrency(transactionTotals.taxableAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total GST</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(transactionTotals.totalGst)}</p>
                    </div>
                    <div className="lg:col-span-1">
                      <p className="text-xs text-gray-500">Grand Total</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(finalGrandTotal)}</p>
                    </div>
                  </div>
                  {watchedDiscountType !== 'none' && watchedDiscountValue > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        After {watchedDiscountType === 'percentage' ? watchedDiscountValue + '%' : '₹' + watchedDiscountValue} transaction discount:
                        <span className="font-bold text-gray-900 ml-2">{formatCurrency(finalGrandTotal)}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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

      {/* Add New Material Modal */}
      {showAddMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Add New Material</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddMaterialModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {materialFormError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{materialFormError}</span>
              </div>
            )}

            <form onSubmit={handleMaterialSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="matItemName">Item Name *</Label>
                <Input
                  id="matItemName"
                  name="item_name"
                  defaultValue={newMaterialInitialName}
                  placeholder="e.g., UltraTech Cement 53 Grade"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="matItemCode">Item Code (Optional)</Label>
                <Input
                  id="matItemCode"
                  name="item_code"
                  placeholder="e.g., CEM-UT-53"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="matCategory">Category (Optional)</Label>
                <Select name="category_id">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                    {categories.length === 0 && <div className="px-2 py-3 text-center text-gray-500">No categories. Add from Settings.</div>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="matUnit">Unit *</Label>
                <Select name="unit" required defaultValue="PCS">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="matRate">Rate (₹) *</Label>
                  <Input
                    id="matRate"
                    name="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="matGst">GST %</Label>
                  <Input
                    id="matGst"
                    name="gst_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="18"
                    defaultValue="0"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="matHsn">HSN Code (Optional)</Label>
                <Input
                  id="matHsn"
                  name="hsn_code"
                  placeholder="e.g., 252329"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="matDesc">Description (Optional)</Label>
                <Textarea
                  id="matDesc"
                  name="description"
                  placeholder="Additional details about this material"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddMaterialModal(false)}
                  disabled={materialFormSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={materialFormSubmitting} className="bg-blue-600 hover:bg-blue-700">
                  {materialFormSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Material & Select
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}