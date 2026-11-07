'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Edit, Tag, Package, Scale, FileText, Loader2, Share2, Download, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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

const mockProduct: Product = {
  id: '1',
  item_name: 'Cement (OPC 53 Grade)',
  item_code: 'CEM-001',
  category: 'Building Materials',
  unit: 'Bag',
  quantity: 1,
  rate: 350,
  gst_percentage: 28,
  final_rate: 448,
  status: 'active',
  description: 'High quality OPC 53 grade cement for construction. Suitable for all types of concrete work.',
  hsn_code: '2523',
  created_at: '2024-01-10',
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${productId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch product');
      }

      setProduct(result.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      alert('Delete not implemented in demo');
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
            <h1 className="text-2xl font-bold text-gray-900">Product Details</h1>
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
        <h2 className="text-xl font-semibold text-gray-900">Unable to load product</h2>
        <p className="text-gray-500 mt-2">{error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/rate-list">Back to Rate List</Link>
        </Button>
      </div>
    );
  }

  if (!product) return null;

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
            <p className="text-gray-500">{product.item_code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/rate-list/${product.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
          {product.status === 'active' ? 'Active' : 'Inactive'}
        </Badge>
        <span className="text-sm text-gray-500">Created on {new Date(product.created_at).toLocaleDateString()}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>Product identification and classification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Category</Label>
                <p className="font-medium">{product.category}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Unit</Label>
                <p className="font-medium">{product.unit}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">HSN Code</Label>
                <p className="font-medium font-mono">{product.hsn_code || '—'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Default Quantity</Label>
                <p className="font-medium">{product.quantity.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Pricing Details
            </CardTitle>
            <CardDescription>Rates and tax information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <Label className="text-sm font-medium text-gray-500">Base Rate</Label>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(product.rate)}</p>
                <p className="text-sm text-gray-500">per {product.unit}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <Label className="text-sm font-medium text-gray-500">GST Percentage</Label>
                <p className="text-2xl font-bold text-blue-600">{product.gst_percentage}%</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-500">Final Rate (incl. GST)</Label>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(product.final_rate)}</p>
                    <p className="text-sm text-gray-500">per {product.unit}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{product.description || 'No description provided'}</p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button asChild variant="outline">
              <Link href={`/dashboard/rate-list/${product.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Product
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/rate-list/new">
                <Package className="mr-2 h-4 w-4" />
                Add Similar Product
              </Link>
            </Button>
            <Button variant="outline" onClick={() => alert('PDF generation coming soon')}>
              <Download className="mr-2 h-4 w-4" />
              Download Product Sheet
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}