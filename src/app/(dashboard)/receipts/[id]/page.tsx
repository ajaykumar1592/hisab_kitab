'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Printer, Download, Loader2, AlertCircle, CreditCard, User, MapPin, Phone, Mail } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentReceipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  customer_name: string;
  customer_mobile: string;
  customer_address: string;
  customer_gstin: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  description: string;
  status: 'issued' | 'cancelled';
  created_at: string;
}

const mockReceipt: PaymentReceipt = {
  id: '1',
  receipt_number: 'RCP-2024-001',
  receipt_date: '2024-01-15',
  customer_name: 'Rajesh Kumar',
  customer_mobile: '9876543210',
  customer_address: '123 Main Street, Mumbai, Maharashtra - 400001',
  customer_gstin: '27ABCDE1234F1Z5',
  amount: 5000,
  payment_method: 'upi',
  reference_number: 'PY-2024-001',
  description: 'Payment for Invoice INV-001',
  status: 'issued',
  created_at: '2024-01-15T10:30:00Z',
};

const companyInfo = {
  name: 'Hisab Kitab',
  address: '123 Business Street, City, State - 123456',
  gstin: '29ABCDE1234F1Z5',
  phone: '+91 98765 43210',
  email: 'info@hisabkitab.com',
};

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = params.id as string;

  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetchReceipt();
  }, [receiptId]);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      // In real app: const response = await fetch(`/api/receipts/${receiptId}`);
      setReceipt(mockReceipt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setPrinting(true);
    window.print();
    setTimeout(() => setPrinting(false), 1000);
  };

  const handleDownload = async () => {
    // In real app, call API to generate PDF
    handlePrint();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/receipts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receipt Details</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error && !receipt) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Unable to load receipt</h2>
        <p className="text-gray-500 mt-2">{error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/receipts">Back to Receipts</Link>
        </Button>
      </div>
    );
  }

  if (!receipt) return null;

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      upi: 'UPI',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      other: 'Other',
    };
    return labels[method] || method;
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertHundreds(n: number): string {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    }

    if (num === 0) return 'Zero Rupees Only';

    let result = '';
    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = Math.floor(num / 100);
    num %= 100;

    if (crore > 0) result += convertHundreds(crore) + 'Crore ';
    if (lakh > 0) result += convertHundreds(lakh) + 'Lakh ';
    if (thousand > 0) result += convertHundreds(thousand) + 'Thousand ';
    if (hundred > 0) result += convertHundreds(hundred) + 'Hundred ';
    if (num > 0) {
      if (result && (crore > 0 || lakh > 0 || thousand > 0 || hundred > 0)) {
        result += 'and ';
      }
      result += convertHundreds(num);
    }

    return result.trim() + ' Rupees Only';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/receipts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Receipt</h1>
            <p className="text-gray-500">{receipt.receipt_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={receipt.status === 'issued' ? 'success' : 'destructive'}>
            {receipt.status}
          </Badge>
          <Button asChild variant="outline">
            <Link href={`/dashboard/receipts/${receipt.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={printing}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Receipt Card - Print Layout */}
      <div id="receipt-print" className="bg-white p-8 print:shadow-none">
        {/* Company Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-300">
          <div>
            <h2 className="text-2xl font-bold text-blue-800">{companyInfo.name}</h2>
            <p className="text-sm text-gray-600">{companyInfo.address}</p>
            <p className="text-sm text-gray-600">GSTIN: {companyInfo.gstin}</p>
            <p className="text-sm text-gray-600">Phone: {companyInfo.phone} | Email: {companyInfo.email}</p>
          </div>
          <div className="text-right">
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-bold text-lg">
              PAYMENT RECEIPT
            </div>
          </div>
        </div>

        {/* Receipt Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Receipt No.</p>
            <p className="font-bold text-lg text-blue-600">{receipt.receipt_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-medium">{formatDate(receipt.receipt_date)}</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <User className="h-5 w-5" />
            Received From
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium">{receipt.customer_name}</p>
              <p className="text-gray-600 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {receipt.customer_mobile}
              </p>
            </div>
            <div>
              <p className="text-gray-600 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {receipt.customer_address}
              </p>
              {receipt.customer_gstin && (
                <p className="text-gray-600 flex items-center gap-1 mt-1">
                  GSTIN: {receipt.customer_gstin}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Details
          </h3>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="px-4 py-3 text-left text-gray-600 border border-gray-200 w-1/3">Payment Method</td>
                <td className="px-4 py-3 text-left font-medium border border-gray-200 capitalize">{getMethodLabel(receipt.payment_method)}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-left text-gray-600 border border-gray-200">Reference Number</td>
                <td className="px-4 py-3 text-left font-mono font-medium border border-gray-200">{receipt.reference_number}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-left text-gray-600 border border-gray-200">Description</td>
                <td className="px-4 py-3 text-left border border-gray-200">{receipt.description || '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Amount Received</p>
              <p className="text-3xl font-bold text-green-700">{formatCurrency(receipt.amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Amount in Words</p>
              <p className="text-sm font-medium text-green-800">{numberToWords(receipt.amount)}</p>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="flex justify-end">
          <div className="w-48">
            <div className="border-t border-gray-400 mb-2" />
            <p className="text-sm text-gray-600 text-center">Authorized Signatory</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>This is a computer-generated receipt. No signature required.</p>
          <p className="mt-1">Generated on {new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="flex flex-wrap gap-4 pt-6">
          <Button variant="outline" onClick={handlePrint} disabled={printing}>
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/receipts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}