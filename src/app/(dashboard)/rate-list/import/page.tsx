'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Upload, Download, FileText, X, Check, AlertTriangle, HelpCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ProductRow {
  id: string;
  item_name: string;
  item_code: string;
  category: string;
  unit: string;
  quantity: number;
  rate: number;
  gst_percentage: number;
  hsn_code: string;
  description: string;
  status: 'active' | 'inactive';
}

interface ValidationResult {
  valid: ProductRow[];
  invalid: Array<{ row: ProductRow; errors: string[] }>;
}

const mockCategories = [
  'Building Materials',
  'Construction Materials',
  'Plumbing',
  'Electrical',
  'Paint & Hardware',
];

const mockUnits = [
  'Piece', 'Kg', 'Gram', 'Litre', 'Millilitre', 'Meter', 'Feet',
  'Box', 'Packet', 'Dozen', 'Bag', 'Ton', 'Cubic Feet', 'Square Feet',
  'Roll', 'Set', 'Pair', 'Custom'
];

const sampleData = [
  {
    item_name: 'Cement (OPC 53 Grade)',
    item_code: 'CEM-001',
    category: 'Building Materials',
    unit: 'Bag',
    quantity: 1,
    rate: 350,
    gst_percentage: 28,
    hsn_code: '2523',
    description: 'High quality OPC 53 grade cement',
    status: 'active',
  },
  {
    item_name: 'TMT Steel Bar 12mm',
    item_code: 'STL-001',
    category: 'Construction Materials',
    unit: 'Kg',
    quantity: 1,
    rate: 65,
    gst_percentage: 18,
    hsn_code: '7214',
    description: 'Fe500 grade TMT steel bars',
    status: 'active',
  },
  {
    item_name: 'River Sand',
    item_code: 'SND-001',
    category: 'Building Materials',
    unit: 'Cubic Feet',
    quantity: 1,
    rate: 45,
    gst_percentage: 5,
    hsn_code: '2505',
    description: 'Clean river sand for construction',
    status: 'active',
  },
];

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'review' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ProductRow[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedFileName, setParsedFileName] = useState('');

  const parseFile = async (file: File) => {
    return new Promise<ProductRow[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          let rows: ProductRow[] = [];

          if (file.name.endsWith('.csv')) {
            rows = parseCSV(text);
          } else if (file.name.endsWith('.json')) {
            rows = parseJSON(text);
          } else {
            reject(new Error('Unsupported file format. Please upload CSV or JSON.'));
            return;
          }

          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const parseCSV = (text: string): ProductRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const requiredFields = ['item_name'];

    // Check required headers
    const missingHeaders = requiredFields.filter(f => !headers.includes(f));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
    }

    const rows: ProductRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length === 1 && values[0] === '') continue;

      const row: Partial<ProductRow> = {};
      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header) {
          case 'item_name':
            row.item_name = value;
            break;
          case 'item_code':
            row.item_code = value;
            break;
          case 'category':
            row.category = value;
            break;
          case 'unit':
            row.unit = value;
            break;
          case 'quantity':
            row.quantity = parseFloat(value) || 1;
            break;
          case 'rate':
            row.rate = parseFloat(value) || 0;
            break;
          case 'gst_percentage':
            row.gst_percentage = parseFloat(value) || 18;
            break;
          case 'hsn_code':
            row.hsn_code = value;
            break;
          case 'description':
            row.description = value;
            break;
          case 'status':
            row.status = (value?.toLowerCase() === 'inactive') ? 'inactive' : 'active';
            break;
        }
      });

      if (row.item_name) {
        rows.push({
          id: `temp-${i}`,
          item_name: row.item_name,
          item_code: row.item_code || '',
          category: row.category || 'Uncategorized',
          unit: row.unit || 'Piece',
          quantity: row.quantity || 1,
          rate: row.rate || 0,
          gst_percentage: row.gst_percentage || 18,
          hsn_code: row.hsn_code || '',
          description: row.description || '',
          status: row.status || 'active',
        });
      }
    }

    return rows;
  };

  const parseJSON = (text: string): ProductRow[] => {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of objects');
    }

    return data.map((item, index) => ({
      id: `temp-${index}`,
      item_name: item.item_name || '',
      item_code: item.item_code || '',
      category: item.category || 'Uncategorized',
      unit: item.unit || 'Piece',
      quantity: item.quantity || 1,
      rate: item.rate || 0,
      gst_percentage: item.gst_percentage || 18,
      hsn_code: item.hsn_code || '',
      description: item.description || '',
      status: item.status === 'inactive' ? ('inactive' as const) : ('active' as const),
    })).filter(r => r.item_name);
  };

  const validateData = (data: ProductRow[]): ValidationResult => {
    const valid: ProductRow[] = [];
    const invalid: Array<{ row: ProductRow; errors: string[] }> = [];

    data.forEach((row) => {
      const errors: string[] = [];

      if (!row.item_name || row.item_name.trim() === '') {
        errors.push('Item name is required');
      }

      if (row.item_name && row.item_name.length > 255) {
        errors.push('Item name exceeds 255 characters');
      }

      if (row.item_code && row.item_code.length > 50) {
        errors.push('Item code exceeds 50 characters');
      }

      if (!row.unit || row.unit.trim() === '') {
        errors.push('Unit is required');
      }

      if (row.quantity < 1) {
        errors.push('Quantity must be at least 1');
      }

      if (row.rate < 0) {
        errors.push('Rate cannot be negative');
      }

      if (row.gst_percentage < 0 || row.gst_percentage > 100) {
        errors.push('GST percentage must be between 0 and 100');
      }

      if (row.hsn_code && row.hsn_code.length > 20) {
        errors.push('HSN code exceeds 20 characters');
      }

      if (!mockCategories.includes(row.category)) {
        errors.push(`Category "${row.category}" does not exist`);
      }

      if (!mockUnits.includes(row.unit)) {
        errors.push(`Unit "${row.unit}" is not a standard unit`);
      }

      if (errors.length > 0) {
        invalid.push({ row, errors });
      } else {
        valid.push(row);
      }
    });

    return { valid, invalid };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.json')) {
      setError('Please upload a CSV or JSON file');
      return;
    }

    setError(null);
    setFile(selectedFile);
    setParsedFileName(selectedFile.name);
    setLoading(true);

    try {
      const data = await parseFile(selectedFile);
      const result = validateData(data);
      setPreviewData(data);
      setValidationResult(result);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = (format: 'csv' | 'json') => {
    let content: string;
    let filename: string;

    if (format === 'csv') {
      const headers = [
        'item_name', 'item_code', 'category', 'unit', 'quantity',
        'rate', 'gst_percentage', 'hsn_code', 'description', 'status'
      ];
      const rows = [
        headers.join(','),
        ...sampleData.map(item => [
          item.item_name,
          item.item_code,
          item.category,
          item.unit,
          item.quantity,
          item.rate,
          item.gst_percentage,
          item.hsn_code,
          item.description,
          item.status,
        ].join(','))
      ];
      content = rows.join('\n');
      filename = 'rate-list-template.csv';
    } else {
      content = JSON.stringify(sampleData, null, 2);
      filename = 'rate-list-template.json';
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!validationResult || validationResult.valid.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // In a real app, this would call the API to bulk import
      // For now, simulate the import
      await new Promise(resolve => setTimeout(resolve, 1500));

      setImportResults({
        success: validationResult.valid.length,
        failed: validationResult.invalid.length,
        errors: validationResult.invalid.map(i => `${i.row.item_name}: ${i.errors.join(', ')}`),
      });
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('upload');
    setFile(null);
    setPreviewData([]);
    setValidationResult(null);
    setImportResults(null);
    setError(null);
    setParsedFileName('');
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/rate-list">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Rate List</h1>
          <p className="text-gray-500">Bulk import products from CSV or JSON file</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Choose a CSV or JSON file to import products</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Drop Zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              )}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading}
              />
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-gray-600">Processing file...</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-12 w-12 text-blue-600" />
                  <p className="font-medium">{parsedFileName}</p>
                  <p className="text-sm text-gray-500">Click to change file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-12 w-12 text-gray-400" />
                  <p className="text-gray-600">Drag & drop a CSV or JSON file here, or click to browse</p>
                  <p className="text-sm text-gray-500">Max file size: 5MB</p>
                </div>
              )}
            </div>

            {/* Template Downloads */}
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Download Templates</h4>
              <p className="text-sm text-gray-500">Use these templates to format your data correctly</p>
              <div className="flex gap-4">
                <Button variant="outline" asChild onClick={() => downloadTemplate('csv')}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV Template
                </Button>
                <Button variant="outline" asChild onClick={() => downloadTemplate('json')}>
                  <Download className="mr-2 h-4 w-4" />
                  JSON Template
                </Button>
              </div>
            </div>

            {/* Format Guide */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                Required & Optional Fields
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-green-600 mb-1">Required:</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• item_name</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-blue-600 mb-1">Optional:</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• item_code (auto-generated if empty)</li>
                    <li>• category (must exist in system)</li>
                    <li>• unit (standard units only)</li>
                    <li>• quantity (default: 1)</li>
                    <li>• rate (default: 0)</li>
                    <li>• gst_percentage (default: 18)</li>
                    <li>• hsn_code</li>
                    <li>• description</li>
                    <li>• status (active/inactive, default: active)</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button disabled={loading || !file} onClick={() => setStep('review')}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Next: Review Data'
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Review */}
      {step === 'review' && validationResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Rows</p>
                    <p className="text-2xl font-bold">{previewData.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Valid</p>
                    <p className="text-2xl font-bold text-green-600">{validationResult.valid.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Invalid</p>
                    <p className="text-2xl font-bold text-red-600">{validationResult.invalid.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Will Skip</p>
                    <p className="text-2xl font-bold text-purple-600">{validationResult.invalid.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Valid Data Table */}
          {validationResult.valid.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Valid Products (Ready to Import)</CardTitle>
                <CardDescription>{validationResult.valid.length} products will be imported</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Item Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">GST%</TableHead>
                        <TableHead>HSN</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.valid.slice(0, 20).map((row) => (
                        <TableRow key={row.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{row.item_name}</TableCell>
                          <TableCell className="text-sm font-mono text-gray-500">{row.item_code || 'Auto'}</TableCell>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>{row.unit}</TableCell>
                          <TableCell className="text-right font-mono">{row.quantity.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(row.rate)}</TableCell>
                          <TableCell className="text-right">{row.gst_percentage}%</TableCell>
                          <TableCell className="text-sm font-mono">{row.hsn_code || '—'}</TableCell>
                          <TableCell>
                            <span className={cn(
                              'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                              row.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            )}>
                              {row.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {validationResult.valid.length > 20 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-gray-500 py-4">
                            And {validationResult.valid.length - 20} more...
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invalid Data Table */}
          {validationResult.invalid.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Invalid Rows (Will Be Skipped)
                </CardTitle>
                <CardDescription>{validationResult.invalid.length} rows have errors and will not be imported</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-red-50">
                        <TableHead>Item Name</TableHead>
                        <TableHead>Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.invalid.map(({ row, errors }) => (
                        <TableRow key={row.id} className="hover:bg-red-50">
                          <TableCell className="font-medium">{row.item_name || '(empty)'}</TableCell>
                          <TableCell>
                            <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                              {errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardContent className="flex flex-col sm:flex-row justify-end gap-4 pt-6">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleImport} disabled={loading || validationResult.valid.length === 0}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import ${validationResult.valid.length} Products`
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 'complete' && importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Import Complete
            </CardTitle>
            <CardDescription>
              {importResults.success} products imported successfully
              {importResults.failed > 0 && `, ${importResults.failed} skipped`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">Imported</p>
                <p className="text-3xl font-bold text-green-600">{importResults.success}</p>
              </div>
              {importResults.failed > 0 && (
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">Skipped</p>
                  <p className="text-3xl font-bold text-red-600">{importResults.failed}</p>
                </div>
              )}
            </div>

            {importResults.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1 max-h-40 overflow-auto">
                  {importResults.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            <div className="flex gap-4">
              <Button asChild variant="outline">
                <Link href="/dashboard/rate-list">
                  View Rate List
                </Link>
              </Button>
              <Button onClick={resetForm}>
                Import Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}