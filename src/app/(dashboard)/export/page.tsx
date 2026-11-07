'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Loader2, CheckCircle2, FileDown, Users, CreditCard, Receipt, Package, Settings2 } from 'lucide-react';

const exportTypes = [
  { value: 'all', label: 'Complete Backup', description: 'All data including customers, transactions, receipts, products, and settings' },
  { value: 'customers', label: 'Customers Only', description: 'Customer master data' },
  { value: 'transactions', label: 'Transactions Only', description: 'Ledger and transaction history' },
  { value: 'receipts', label: 'Receipts Only', description: 'Payment receipts and confirmations' },
  { value: 'products', label: 'Products/Rate List', description: 'Product catalog and pricing' },
  { value: 'settings', label: 'Settings Only', description: 'Business configuration and preferences' },
];

export default function ExportDataPage() {
  const router = useRouter();
  const [exportType, setExportType] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/export/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: exportType }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `backup_${new Date().toISOString().split('T')[0]}.zip`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Export completed successfully!');
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Export Data</h1>
        <p className="text-gray-500">Download your business data as CSV files or a complete backup ZIP</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Choose what data to export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={exportType} onValueChange={setExportType} className="space-y-3">
            {exportTypes.map((type) => (
              <Label key={type.value} className="cursor-pointer">
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value={type.value} className="mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                </div>
              </Label>
            ))}
          </RadioGroup>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-dashed">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium">Customers</p>
                <p className="text-xs text-gray-500">All customer records</p>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="p-4 text-center">
                <CreditCard className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium">Transactions</p>
                <p className="text-xs text-gray-500">Ledger entries</p>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardContent className="p-4 text-center">
                <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium">Products</p>
                <p className="text-xs text-gray-500">Rate list items</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {exportType === 'all' ? 'Backup' : exportType.charAt(0).toUpperCase() + exportType.slice(1)}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
          <CardDescription>Import from templates or previous exports</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            You can also import data from the respective modules:
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            <Button variant="outline" asChild>
              <a href="/dashboard/customers/new">
                <Users className="mr-2 h-4 w-4" />
                Import Customers
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard/rate-list/import">
                <Package className="mr-2 h-4 w-4" />
                Import Products
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backup Schedule</CardTitle>
          <CardDescription>Automatic backups will be available in future updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Automatic Daily Backup</p>
              <p className="text-sm text-gray-500">Will download a backup every day at 2 AM</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}