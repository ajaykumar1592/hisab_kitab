'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download, FileText, Loader2, Printer, Settings } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { generateRateListPDF } from '@/lib/pdf/generator';

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
  hsn_code?: string;
  description?: string;
  created_at?: string;
}

interface Category {
  id: string;
  name: string;
}

export default function RateListPDFPage() {
  const { t, isHindi } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showHSN, setShowHSN] = useState(true);
  const [showDescription, setShowDescription] = useState(false);
  const [companyName, setCompanyName] = useState('Hisab Kitab Store');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyGSTIN, setCompanyGSTIN] = useState('');
  const [reportTitle, setReportTitle] = useState('Rate List / Price List');
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();

      const [prodRes, catRes, bizRes] = await Promise.all([
        fetch('/api/products?limit=500', { headers }),
        fetch('/api/categories', { headers }),
        fetch('/api/business', { headers }),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      }

      if (catRes.ok) {
        const catData = await catRes.json();
        const catNames = (catData.categories || []).map((c: Category) => c.name);
        setCategories(catNames);
      }

      if (bizRes.ok) {
        const bizData = await bizRes.json();
        if (bizData.business) {
          if (bizData.business.name) setCompanyName(bizData.business.name);
          const addrParts = [bizData.business.address, bizData.business.city, bizData.business.state, bizData.business.pin_code].filter(Boolean);
          if (addrParts.length > 0) setCompanyAddress(addrParts.join(', '));
          if (bizData.business.gstin) setCompanyGSTIN(bizData.business.gstin);
        }
      }
    } catch (e) {
      console.error('Failed to load initial PDF data:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products
    .filter(p => {
      if (!includeInactive && p.status === 'inactive') return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      return true;
    })
    .sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.item_name || '').localeCompare(b.item_name || ''));

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const cat = product.category || 'General';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(product);
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
            <meta charset="utf-8" />
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 24px; color: #1a1a1a; }
              .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #333; padding-bottom: 16px; }
              .company-name { font-size: 26px; font-weight: bold; margin-bottom: 4px; color: #1e3a8a; }
              .company-details { font-size: 13px; color: #4b5563; }
              .report-title { font-size: 18px; font-weight: bold; margin: 16px 0 6px 0; }
              .report-date { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
              .category-header { background-color: #dbeafe; font-weight: bold; color: #1e40af; padding: 8px 12px; border-radius: 4px 4px 0 0; border: 1px solid #bfdbfe; font-size: 14px; margin-top: 16px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
              th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; font-size: 12px; }
              th { background-color: #f1f5f9; font-weight: 600; color: #334155; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .final-rate { font-weight: bold; color: #1e40af; text-align: right; }
              .footer { text-align: center; margin-top: 24px; padding-top: 12px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
              @media print {
                body { margin: 0; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);
      }
    }
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      // Build RateListData
      const rateListData = {
        companyInfo: {
          name: companyName || 'Hisab Kitab Store',
          address: companyAddress || 'Main Market',
          gstin: companyGSTIN || '',
        },
        reportTitle: reportTitle || 'Rate List / Price List',
        generatedDate: new Date().toISOString(),
        products: Object.entries(groupedProducts).map(([category, items]) => ({
          category,
          items: items.map(item => ({
            itemName: item.item_name,
            itemCode: item.item_code || '-',
            unit: item.unit || 'Piece',
            quantity: item.quantity || 1,
            rate: item.rate || 0,
            gstPercentage: item.gst_percentage || 0,
            finalRate: item.final_rate || 0,
            hsnCode: item.hsn_code || '-',
            description: item.description || '',
          })),
        })),
      };

      const pdfBytes = await generateRateListPDF(rateListData);
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rate_List_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Direct PDF creation error, falling back to print window:', err);
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
            <h1 className="text-2xl font-bold text-gray-900">{t('rateListPdfTitle', 'Rate List PDF')}</h1>
            <p className="text-gray-500">{isHindi ? 'रेट लिस्ट तैयार करें और पीडीएफ डाउनलोड या प्रिंट करें' : 'Generate and download rate list as PDF'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={generating || loading}>
            <Printer className="mr-2 h-4 w-4" />
            {t('printPdf', 'Print')}
          </Button>
          <Button onClick={handleDownload} disabled={generating || loading}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isHindi ? 'पीडीएफ बन रही है...' : 'Generating...'}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t('downloadPdf', 'Download PDF')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            {t('pdfSettings', 'PDF Settings')}
          </CardTitle>
          <CardDescription>
            {isHindi ? 'पीडीएफ में दिखने वाली कंपनी और सामग्री की जानकारी सेट करें' : 'Configure the PDF output'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{isHindi ? 'व्यापार / दुकान का नाम' : 'Company Name'}</Label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isHindi ? 'दुकान / कंपनी का पता' : 'Company Address'}</Label>
              <Input value={companyAddress} placeholder="City, State" onChange={e => setCompanyAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('gstin', 'GSTIN')}</Label>
              <Input value={companyGSTIN} placeholder="GSTIN number" onChange={e => setCompanyGSTIN(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isHindi ? 'दस्तावेज़ का शीर्षक' : 'Report Title'}</Label>
            <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{isHindi ? 'श्रेणी फ़िल्टर' : 'Filter by Category'}</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isHindi ? 'सभी श्रेणियाँ' : 'All Categories'}</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isHindi ? 'स्थिति फ़िल्टर' : 'Filter by Status'}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all', 'All')}</SelectItem>
                  <SelectItem value="active">{t('active', 'Active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive', 'Inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={e => setIncludeInactive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{isHindi ? 'निष्क्रिय उत्पाद भी शामिल करें' : 'Include Inactive Products'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showHSN}
                onChange={e => setShowHSN(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{isHindi ? 'HSN कोड दिखाएं' : 'Show HSN Code'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showDescription}
                onChange={e => setShowDescription(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{isHindi ? 'विवरण दिखाएं' : 'Show Description'}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* PDF Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {isHindi ? 'पीडीएफ पूर्वावलोकन' : 'PDF Preview'}
          </CardTitle>
          <CardDescription>
            {filteredProducts.length} {isHindi ? 'उत्पाद' : 'products'} • {Object.keys(groupedProducts).length} {isHindi ? 'श्रेणियाँ' : 'categories'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <p className="text-gray-500">{isHindi ? 'रेट लिस्ट डेटा लोड हो रहा है...' : 'Loading rate list data...'}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">{isHindi ? 'कोई सामग्री / उत्पाद नहीं मिला' : 'No products found matching filters'}</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/rate-list/new">{t('addProduct', 'Add Item')}</Link>
              </Button>
            </div>
          ) : (
            <div ref={printRef} className="bg-white p-6 border rounded-lg shadow-sm" style={{ maxWidth: '850px', margin: '0 auto' }}>
              {/* Header */}
              <div className="header mb-6 pb-4 border-b-2 border-gray-300 text-center">
                <div className="company-name text-2xl font-bold text-blue-900">{companyName}</div>
                <div className="company-details text-xs text-gray-600 mt-1">
                  {companyAddress && <div>{companyAddress}</div>}
                  {companyGSTIN && <div>GSTIN: {companyGSTIN}</div>}
                </div>
                <div className="report-title text-lg font-bold text-gray-800 mt-4">{reportTitle}</div>
                <div className="report-date text-xs text-gray-500 mt-1">
                  {isHindi ? 'दिनांक:' : 'Generated on'} {formatDate(new Date().toISOString().split('T')[0])} • {filteredProducts.length} {isHindi ? 'सामग्रियां' : 'items'}
                </div>
              </div>

              {/* Products Table */}
              {Object.entries(groupedProducts).map(([category, items]) => (
                <div key={category} className="mb-6">
                  <div className="category-header bg-blue-50 px-4 py-2 rounded-t font-semibold text-blue-900 border border-blue-200 text-sm">
                    {category} ({items.length} {isHindi ? 'सामग्री' : 'items'})
                  </div>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-300 text-xs">
                        <th className="px-3 py-2 text-left w-10 border-r border-gray-300">#</th>
                        <th className="px-3 py-2 text-left border-r border-gray-300">{t('itemName', 'Item Name')}</th>
                        <th className="px-3 py-2 text-left w-24 border-r border-gray-300">{t('itemCode', 'Code')}</th>
                        <th className="px-3 py-2 text-center w-20 border-r border-gray-300">{t('unit', 'Unit')}</th>
                        <th className="px-3 py-2 text-right w-16 border-r border-gray-300">{t('quantity', 'Qty')}</th>
                        <th className="px-3 py-2 text-right w-24 border-r border-gray-300">{t('baseRate', 'Rate')}</th>
                        <th className="px-3 py-2 text-center w-16 border-r border-gray-300">{t('gstRate', 'GST%')}</th>
                        <th className="px-3 py-2 text-right w-28 border-r border-gray-300">{t('finalRate', 'Final Rate')}</th>
                        {showHSN && (
                          <th className="px-3 py-2 text-left w-20 border-r border-gray-300">{t('hsnCode', 'HSN')}</th>
                        )}
                        <th className="px-3 py-2 text-center w-20">{t('status', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((product, index) => (
                        <tr key={product.id} className="hover:bg-gray-50 text-xs">
                          <td className="px-3 py-2 text-gray-500 border-r border-gray-200 border-b border-gray-100">{index + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-900 border-r border-gray-200 border-b border-gray-100">
                            {product.item_name}
                            {showDescription && product.description && (
                              <div className="text-[11px] text-gray-500 mt-0.5">{product.description}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-500 border-r border-gray-200 border-b border-gray-100">{product.item_code || '-'}</td>
                          <td className="px-3 py-2 text-center text-gray-700 border-r border-gray-200 border-b border-gray-100">{product.unit}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-700 border-r border-gray-200 border-b border-gray-100">{product.quantity?.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900 border-r border-gray-200 border-b border-gray-100">{formatCurrency(product.rate)}</td>
                          <td className="px-3 py-2 text-center text-gray-700 border-r border-gray-200 border-b border-gray-100">{product.gst_percentage}%</td>
                          <td className="px-3 py-2 text-right font-bold text-blue-700 border-r border-gray-200 border-b border-gray-100">{formatCurrency(product.final_rate)}</td>
                          {showHSN && (
                            <td className="px-3 py-2 font-mono text-gray-600 border-r border-gray-200 border-b border-gray-100">{product.hsn_code || '—'}</td>
                          )}
                          <td className="px-3 py-2 text-center border-b border-gray-100">
                            <span className={cn(
                              'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium',
                              product.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            )}>
                              {product.status === 'active' ? (isHindi ? 'सक्रिय' : 'Active') : (isHindi ? 'निष्क्रिय' : 'Inactive')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {/* Footer */}
              <div className="footer mt-6 pt-4 border-t border-gray-300 text-center text-[11px] text-gray-500">
                <p>{isHindi ? 'उत्पन्न:' : 'Generated by'} {companyName} • {new Date().toLocaleString()}</p>
                <p className="mt-0.5">{isHindi ? 'यह एक कंप्यूटर जनरेटेड रेट लिस्ट है।' : 'This is a computer-generated document. No signature required.'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
