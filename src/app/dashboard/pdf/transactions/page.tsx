'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download, FileText, Loader2, Printer, Eye, Settings, Calendar } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  transaction_date: string;
  transaction_type: string;
  amount: number;
  description: string;
  reference_number: string;
  payment_method: string;
  customer_name: string;
  customer_id: string;
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    transaction_date: '2024-01-15',
    transaction_type: 'credit',
    amount: 5000,
    description: 'Sale of cement bags',
    reference_number: 'INV-001',
    payment_method: 'cash',
    customer_name: 'Rajesh Kumar',
    customer_id: '1',
  },
  {
    id: '2',
    transaction_date: '2024-01-15',
    transaction_type: 'payment',
    amount: 2000,
    description: 'Payment received',
    reference_number: 'PY-2024-001',
    payment_method: 'upi',
    customer_name: 'Rajesh Kumar',
    customer_id: '1',
  },
  {
    id: '3',
    transaction_date: '2024-01-14',
    transaction_type: 'credit',
    amount: 15000,
    description: 'Steel rods purchase',
    reference_number: 'INV-002',
    payment_method: 'bank_transfer',
    customer_name: 'Amit Patel',
    customer_id: '3',
  },
  {
    id: '4',
    transaction_date: '2024-01-13',
    transaction_type: 'payment',
    amount: 5000,
    description: 'Partial payment',
    reference_number: 'PY-2024-002',
    payment_method: 'cheque',
    customer_name: 'Priya Sharma',
    customer_id: '2',
  },
  {
    id: '5',
    transaction_date: '2024-01-12',
    transaction_type: 'credit',
    amount: 8000,
    description: 'Construction materials',
    reference_number: 'INV-003',
    payment_method: 'cash',
    customer_name: 'Vikram Reddy',
    customer_id: '5',
  },
];

export default function TransactionsPDFPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [companyName, setCompanyName] = useState('Hisab Kitab');
  const [companyAddress, setCompanyAddress] = useState('123 Business Street, City, State - 123456');
  const [companyGSTIN, setCompanyGSTIN] = useState('29ABCDE1234F1Z5');
  const [reportTitle, setReportTitle] = useState('Transaction Report');
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      credit: 'Credit Sale',
      debit: 'Debit',
      payment: 'Payment Received',
      opening: 'Opening Balance',
      adjustment: 'Adjustment',
      sales_return: 'Sales Return',
      purchase_return: 'Purchase Return',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'credit':
      case 'opening':
        return 'bg-red-50 text-red-700';
      case 'debit':
      case 'payment':
        return 'bg-green-50 text-green-700';
      case 'adjustment':
        return 'bg-blue-50 text-blue-700';
      case 'sales_return':
      case 'purchase_return':
        return 'bg-orange-50 text-orange-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const filteredTransactions = transactions
    .filter((t) => {
      if (typeFilter !== 'all' && t.transaction_type !== typeFilter) return false;
      if (dateFilter !== 'all' && dateFilter !== 'custom') {
        const txnDate = new Date(t.transaction_date);
        const now = new Date();
        let start: Date;
        let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        switch (dateFilter) {
          case 'today':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'yesterday':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
            break;
          case 'week':
            const day = now.getDay();
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
            break;
          case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'last_month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            break;
          default:
            return true;
        }
        return txnDate >= start && txnDate <= end;
      }
      if (dateFilter === 'custom' && customStartDate && customEndDate) {
        const txnDate = new Date(t.transaction_date);
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59);
        return txnDate >= start && txnDate <= end;
      }
      return true;
    })
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

  const totals = {
    credit: filteredTransactions
      .filter((t) => ['credit', 'opening', 'adjustment'].includes(t.transaction_type))
      .reduce((sum, t) => sum + t.amount, 0),
    debit: filteredTransactions
      .filter((t) => ['debit', 'payment', 'sales_return', 'purchase_return'].includes(t.transaction_type))
      .reduce((sum, t) => sum + t.amount, 0),
  };

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
              .summary { display: flex; justify-content: space-around; margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
              .summary-item { text-align: center; }
              .summary-label { font-size: 11px; color: #666; }
              .summary-value { font-size: 14px; font-weight: bold; }
              .summary-value.credit { color: #dc2626; }
              .summary-value.debit { color: #16a34a; }
              .summary-value.net { color: #2563eb; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 10px; }
              th { background-color: #f2f2f2; font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .type-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; }
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
            <Link href="/dashboard/ledger">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction Report PDF</h1>
            <p className="text-gray-500">Generate and download transaction report as PDF</p>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credit Sale</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="payment">Payment Received</SelectItem>
                  <SelectItem value="opening">Opening Balance</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="sales_return">Sales Return</SelectItem>
                  <SelectItem value="purchase_return">Purchase Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setShowCustomDates(v === 'custom'); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex items-center gap-2" style={{ visibility: showCustomDates ? 'visible' : 'hidden' }}>
                <Input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-[140px]" />
                <span className="text-gray-500">to</span>
                <Input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-[140px]" />
              </div>
            </div>
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
          <CardDescription>{filteredTransactions.length} transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={printRef} className="bg-white p-8" style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div className="header mb-8 pb-6 border-b-2 border-gray-300">
              <div className="company-name text-2xl font-bold text-gray-900">{companyName}</div>
              <div className="company-details text-sm text-gray-600">
                <div>{companyAddress}</div>
                <div>GSTIN: {companyGSTIN}</div>
              </div>
              <div className="report-title mt-6">{reportTitle}</div>
              <div className="report-date">
                Generated on {formatDate(new Date().toISOString().split('T')[0])} • {filteredTransactions.length} transactions
                {dateFilter !== 'all' && ` • Period: ${dateFilter === 'custom' ? `${customStartDate} to ${customEndDate}` : dateFilter}`}
              </div>
            </div>

            {/* Summary */}
            <div className="summary mb-6">
              <div className="summary-item">
                <div className="summary-label">Total Credit</div>
                <div className="summary-value credit">{formatCurrency(totals.credit)}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Total Debit</div>
                <div className="summary-value debit">{formatCurrency(totals.debit)}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Net</div>
                <div className={`summary-value net ${totals.credit - totals.debit >= 0 ? 'credit' : 'debit'}`}>
                  {formatCurrency(Math.abs(totals.credit - totals.debit))}
                  {totals.credit - totals.debit >= 0 ? ' Dr' : ' Cr'}
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Customer</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Description</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-r border-gray-300">Type</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-r border-gray-300">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Ref No.</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Payment Method</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-700 border-r border-gray-200 border-b border-gray-100">{formatDate(txn.transaction_date)}</td>
                    <td className="px-3 py-2 text-xs font-medium text-gray-900 border-r border-gray-200 border-b border-gray-100">{txn.customer_name}</td>
                    <td className="px-3 py-2 text-xs text-gray-700 border-r border-gray-200 border-b border-gray-100">{txn.description || '—'}</td>
                    <td className="px-3 py-2 text-center border-r border-gray-200 border-b border-gray-100">
                      <span className={cn('type-badge', getTypeColor(txn.transaction_type))}>
                        {getTypeLabel(txn.transaction_type)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-medium border-r border-gray-200 border-b border-gray-100">
                      <span className={['credit', 'opening', 'adjustment'].includes(txn.transaction_type) ? 'text-red-600' : 'text-green-600'}>
                        {['credit', 'opening', 'adjustment'].includes(txn.transaction_type) ? '+' : '-'}
                        {formatCurrency(txn.amount)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-left text-xs font-mono text-gray-500 border-r border-gray-200 border-b border-gray-100">{txn.reference_number || '—'}</td>
                    <td className="px-3 py-2 text-left text-xs capitalize text-gray-700 border-b border-gray-100">{txn.payment_method?.replace('_', ' ') || '—'}</td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">No transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>

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