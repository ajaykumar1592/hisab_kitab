'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit, Trash2, Package, Scale, FileText, Loader2, Download, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  item_name: string;
  item_code: string;
  category: string;
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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { t, isHindi } = useTranslation();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/products/${productId}`, { headers });
      const result = await response.json();

      if (response.ok && result.product) {
        setProduct(result.product);
      } else {
        throw new Error(result.error?.message || 'Product not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    const confirmMsg = isHindi
      ? `क्या आप वाकई "${product.item_name}" को हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।`
      : `Are you sure you want to delete "${product.item_name}"? This action cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    try {
      setDeleting(true);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error?.message || 'Failed to delete product');
        return;
      }

      router.push('/dashboard/rate-list');
      router.refresh();
    } catch (e) {
      console.error('Error deleting product:', e);
      alert('Failed to delete product');
    } finally {
      setDeleting(false);
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
            <h1 className="text-2xl font-bold text-gray-900">{t('productInformation', 'Product Details')}</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">{isHindi ? 'उत्पाद लोड नहीं हो सका' : 'Unable to load product'}</h2>
        <p className="text-gray-500 mt-2">{error || 'Product not found'}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/rate-list">{isHindi ? 'वापस रेट लिस्ट पर जाएं' : 'Back to Rate List'}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/rate-list">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.item_name}</h1>
            <p className="text-gray-500 font-mono text-sm">{product.item_code || '-'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/rate-list/${product.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              {t('edit', 'Edit')}
            </Link>
          </Button>
          <Button variant="outline" onClick={handleDelete} disabled={deleting} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {t('delete', 'Delete')}
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
          {product.status === 'active' ? (isHindi ? 'सक्रिय' : 'Active') : (isHindi ? 'निष्क्रिय' : 'Inactive')}
        </Badge>
        <span className="text-sm text-gray-500">
          {isHindi ? 'बनाया गया:' : 'Created on'} {product.created_at ? new Date(product.created_at).toLocaleDateString() : '-'}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              {t('productInformation', 'Basic Information')}
            </CardTitle>
            <CardDescription>{isHindi ? 'उत्पाद विवरण एवं वर्गीकरण' : 'Product identification and classification'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">{t('category', 'Category')}</Label>
                <p className="font-semibold text-gray-900">{product.category}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">{t('unit', 'Unit')}</Label>
                <p className="font-semibold text-gray-900">{product.unit}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">{t('hsnCode', 'HSN / SAC Code')}</Label>
                <p className="font-semibold font-mono text-gray-900">{product.hsn_code || '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">{t('quantity', 'Default Quantity')}</Label>
                <p className="font-semibold text-gray-900">{product.quantity?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              {t('pricingAndTax', 'Pricing Details')}
            </CardTitle>
            <CardDescription>{isHindi ? 'मूल्य एवं टैक्स विवरण' : 'Rates and tax information'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <Label className="text-sm font-medium text-gray-500">{t('baseRate', 'Base Rate')}</Label>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(product.rate)}</p>
                <p className="text-xs text-gray-500">/ {product.unit}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <Label className="text-sm font-medium text-gray-500">{t('gstRate', 'GST %')}</Label>
                <p className="text-2xl font-bold text-blue-600">{product.gst_percentage}%</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-green-900">
                      {t('finalRate', 'Final Rate')} ({isHindi ? 'जीएसटी सहित' : 'incl. GST'})
                    </Label>
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(product.final_rate)}</p>
                  </div>
                  <p className="text-xs text-green-800">/ {product.unit}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {t('description', 'Description')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">
              {product.description || (isHindi ? 'कोई विवरण नहीं दिया गया है।' : 'No description provided')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
