'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download, FileText, Loader2, Printer, Eye, Settings } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

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
  hsn_code: string;
  description: string;
  created_at: string;
}

const mockProducts: Product[] = [
  {
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
    hsn_code: '2523',
    description: 'High quality OPC 53 grade cement',
    created_at: '2024-01-10',
  },
  {
    id: '2',
    item_name: 'TMT Steel Bar 12mm',
    item_code: 'STL-001',
    category: 'Construction Materials',
    unit: 'Kg',
    quantity: 1,
    rate: 65,
    gst_percentage: 18,
    final_rate: 76.7,
    status: 'active',
    hsn_code: '7214',
    description: 'Fe500 grade TMT steel bars',
    created_at: '2024-01-10',
  },
  {
    id: '3',
    item_name: 'River Sand',
    item_code: 'SND-001',
    category: 'Building Materials',
    unit: 'Cubic Feet',
    quantity: 1,
    rate: 45,
    gst_percentage: 5,
    final_rate: 47.25,
    status: 'active',
    hsn_code: '2505',
    description: 'Clean river sand for construction',
    created_at: '2024-01-09',
  },
  {
    id: '4',
    item_name: 'Red Bricks',
    item_code: 'BRK-001',
    category: 'Building Materials',
    unit: 'Piece',
    quantity: 1000,
    rate: 6,
    gst_percentage: 5,
    final_rate: 6.3,
    status: 'active',
    hsn_code: '6901',
    description: 'Standard red clay bricks',
    created_at: '2024-01-08',
  },
  {
    id: '5',
    item_name: 'White Cement',
    item_code: 'CEM-002',
    category: 'Building Materials',
    unit: 'Bag',
    quantity: 1,
    rate: 580,
    gst_percentage: 28,
    final_rate: 742.4,
    status: 'inactive',
    hsn_code: '2523',
    description: 'White cement for finishing work',
    created_at: '2024-01-07',
  },
  {
    id: '6',
    item_name: 'PVC Pipe 1 inch',
    item_code: 'PVC-001',
    category: 'Plumbing',
    unit: 'Meter',
    quantity: 1,
    rate: 85,
    gst_percentage: 18,
    final_rate: 100.3,
    status: 'active',
    hsn_code: '3917',
    description: 'PVC pipe for plumbing',
    created_at: '2024-01-06',
  },
];

const categories = ['Building Materials', 'Construction Materials', 'Plumbing', 'Electrical', 'Paint & Hardware'];

export default function RateListPDFPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showHSN, setShowHSN] = useState(true);
  const [showDescription, setShowDescription] = useState(false);
  const [companyName, setCompanyName] = useState('Hisab Kitab');
  const [companyAddress, setCompanyAddress] = useState('123 Business Street, City, State - 123456');
  const [companyGSTIN, setCompanyGSTIN] = useState('29ABCDE1234F1Z5');
  const [reportTitle, setReportTitle] = useState('Rate List / Price List');
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const filteredProducts = products
    .filter(p => {
      if (!includeInactive && p.status === 'inactive') return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.item_name.localeCompare(b.item_name));

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${reportTitle}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .company-details { font-size: 12px; color: #666; }
              .report-title { font-size: 18px; font-weight: bold; margin: 20px 0; }
              .report-date { font-size: 12px; color: #666; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .category-header { background-color: #e8f0fe; font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; }
              @media print { .no-print { display: none; } }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
      }
    }
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      // In a real app, this would call the API to generate PDF
      // For now, we'll use the browser print to PDF
      handlePrint();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/rate-list">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rate List PDF</h1>
            <p className="text-gray-500">Generate and download rate list as PDF</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={generating}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            PDF Settings
          </CardTitle>
          <CardDescription>Configure the PDF output</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company Address</Label>
              <Input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>GSTIN</Label>
              <Input value={companyGSTIN} onChange={e => setCompanyGSTIN(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Report Title</Label>
            <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Filter by Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={e => setIncludeInactive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Include Inactive Products</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showHSN}
                onChange={e => setShowHSN(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Show HSN Code</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDescription}
                onChange={e => setShowDescription(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Show Description</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* PDF Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PDF Preview
          </CardTitle>
          <CardDescription>{filteredProducts.length} products • {Object.keys(groupedProducts).length} categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={printRef} className="bg-white p-8" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div className="header mb-8 pb-6 border-b-2 border-gray-300">
              <div className="company-name text-2xl font-bold text-gray-900">{companyName}</div>
              <div className="company-details text-sm text-gray-600">
                <div>{companyAddress}</div>
                <div>GSTIN: {companyGSTIN}</div>
              </div>
              <div className="report-title mt-6">{reportTitle}</div>
              <div className="report-date">
                Generated on {formatDate(new Date().toISOString().split('T')[0])} • {filteredProducts.length} items
              </div>
            </div>

            {/* Products Table */}
            {Object.entries(groupedProducts).map(([category, items]) => (
              <div key={category} className="mb-6">
                <div className="category-header bg-blue-50 px-4 py-2 rounded-t-lg font-semibold text-blue-900 border border-blue-200">
                  {category} ({items.length} items)
                </div>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Item Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Code</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-300">Unit</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-r border-gray-300">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-r border-gray-300">Rate</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-300">GST%</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-r border-gray-300">Final Rate</th>
                      {showHSN && (
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">HSN</th>
                      )}
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((product, index) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-700 border-r border-gray-200 border-b border-gray-100">{index + 1}</td>
                        <td className="px-3 py-2 text-xs font-medium text-gray-900 border-r border-gray-200 border-b border-gray-100">
                          {product.item_name}
                          {showDescription && product.description && (
                            <div className="text-xs text-gray-500 mt-1">{product.description}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-500 border-r border-gray-200 border-b border-gray-100">{product.item_code}</td>
                        <td className="px-3 py-2 text-center text-xs text-gray-700 border-r border-gray-200 border-b border-gray-100">{product.unit}</td>
                        <td className="px-3 py-2 text-right text-xs font-mono text-gray-700 border-r border-gray-200 border-b border-gray-100">{product.quantity.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-xs font-medium text-gray-900 border-r border-gray-200 border-b border-gray-100">{formatCurrency(product.rate)}</td>
                        <td className="px-3 py-2 text-center text-xs text-gray-700 border-r border-gray-200 border-b border-gray-100">{product.gst_percentage}%</td>
                        <td className="px-3 py-2 text-right text-xs font-bold text-blue-600 border-r border-gray-200 border-b border-gray-100">{formatCurrency(product.final_rate)}</td>
                        {showHSN && (
                          <td className="px-3 py-2 text-left text-xs font-mono text-gray-500 border-r border-gray-200 border-b border-gray-100">{product.hsn_code || '—'}</td>
                        )}
                        <td className="px-3 py-2 text-center text-xs border-b border-gray-100">
                          <span className={cn(
                            'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium',
                            product.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          )}>
                            {product.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Footer */}
            <div className="footer mt-8 pt-6 border-t border-gray-300">
              <p>Generated by {companyName} • {new Date().toLocaleString()}</p>
              <p className="mt-1">This is a computer-generated document. No signature required.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}