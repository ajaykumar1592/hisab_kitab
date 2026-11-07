'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download, FileText, Loader2, Printer, Settings, Calendar } from 'lucide-react';
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
  running_balance: number;
}

interface Customer {
  id: string;
  name: string;
  mobile_number: string;
  address: string;
  gstin: string;
  opening_balance: number;
  opening_balance_type: 'receivable' | 'payable';
}

const mockCustomer: Customer = {
  id: '1',
  name: 'Rajesh Kumar',
  mobile_number: '9876543210',
  address: '123 Main Street, Mumbai, Maharashtra - 400001',
  gstin: '27ABCDE1234F1Z5',
  opening_balance: 5000,
  opening_balance_type: 'receivable',
};

const mockTransactions: Transaction[] = [
  {
    id: '1',
    transaction_date: '2024-01-10',
    transaction_type: 'opening',
    amount: 5000,
    description: 'Opening Balance',
    reference_number: 'OB-001',
    payment_method: '',
    running_balance: 5000,
  },
  {
    id: '2',
    transaction_date: '2024-01-12',
    transaction_type: 'credit',
    amount: 15000,
    description: 'Sale of cement bags',
    reference_number: 'INV-001',
    payment_method: '',
    running_balance: 20000,
  },
  {
    id: '3',
    transaction_date: '2024-01-13',
    transaction_type: 'credit',
    amount: 8000,
    description: 'Steel rods',
    reference_number: 'INV-002',
    payment_method: '',
    running_balance: 28000,
  },
  {
    id: '4',
    transaction_date: '2024-01-14',
    transaction_type: 'payment',
    amount: 5000,
    description: 'Payment received',
    reference_number: 'PY-2024-001',
    payment_method: 'upi',
    running_balance: 23000,
  },
  {
    id: '5',
    transaction_date: '2024-01-15',
    transaction_type: 'credit',
    amount: 12000,
    description: 'Construction materials',
    reference_number: 'INV-003',
    payment_method: '',
    running_balance: 35000,
  },
  {
    id: '6',
    transaction_date: '2024-01-16',
    transaction_type: 'payment',
    amount: 10000,
    description: 'Partial payment',
    reference_number: 'PY-2024-002',
    payment_method: 'bank_transfer',
    running_balance: 25000,
  },
];

const companyInfo = {
  name: 'Hisab Kitab',
  address: '123 Business Street, City, State - 123456',
  gstin: '29ABCDE1234F1Z5',
  phone: '+91 98765 43210',
  email: 'info@hisabkitab.com',
};

export default function CustomerStatementPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [includeOpeningBalance, setIncludeOpeningBalance] = useState(true);
  const [showRunningBalance, setShowRunningBalance] = useState(true);
  const [reportTitle, setReportTitle] = useState('Statement of Account');
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // In real app: const response = await fetch(`/api/customers/${customerId}`);
      setCustomer(mockCustomer);
      setTransactions(mockTransactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const filteredTransactions = transactions
    .filter((t) => {
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
    .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

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

  const handlePrint = () => {
    if (printRef.current) {
      setPrinting(true);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${reportTitle} - ${customer?.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .company-details { font-size: 12px; color: #666; }
              .report-title { font-size: 18px; font-weight: bold; margin: 20px 0; }
              .report-date { font-size: 12px; color: #666; margin-bottom: 20px; }
              .customer-info { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
              .customer-info h3 { margin: 0 0 10px 0; font-size: 14px; }
              .summary { display: flex; justify-content: space-around; margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
              .summary-item { text-align: center; }
              .summary-label { font-size: 11px; color: #666; }
              .summary-value { font-size: 14px; font-weight: bold; }
              .summary-value.receivable { color: #dc2626; }
              .summary-value.payable { color: #16a34a; }
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
        setTimeout(() => {
          printWindow.print();
          setPrinting(false);
        }, 250);
      }
    }
  };

  const openingBalance = customer?.opening_balance || 0;
  const openingBalanceType = customer?.opening_balance_type || 'receivable';

  const totals = filteredTransactions.reduce(
    (acc, t) => {
      if (['credit', 'opening', 'adjustment'].includes(t.transaction_type)) {
        acc.credit += t.amount;
      } else {
        acc.debit += t.amount;
      }
      return acc;
    },
    { credit: 0, debit: 0 }
  );

  const closingBalance = openingBalance + totals.credit - totals.debit;
  const closingBalanceType = closingBalance >= 0 ? 'receivable' : 'payable';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/customers/${customerId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Statement of Account</h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Unable to load statement</h2>
        <p className="text-gray-500 mt-2">{error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/dashboard/customers/${customerId}`}>Back to Customer</Link>
        </Button>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/customers/${customerId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Statement of Account</h1>
            <p className="text-gray-500">{customer.name} • {customer.mobile_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={printing}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Statement Settings
          </CardTitle>
          <CardDescription>Configure the statement output</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Report Title</Label>
              <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} />
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
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeOpeningBalance}
                onChange={e => setIncludeOpeningBalance(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Include Opening Balance</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRunningBalance}
                onChange={e => setShowRunningBalance(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">Show Running Balance</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Statement Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Statement Preview
          </CardTitle>
          <CardDescription>{filteredTransactions.length} transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={printRef} className="bg-white p-8" style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div className="header mb-8 pb-6 border-b-2 border-gray-300">
              <div className="company-name text-2xl font-bold text-gray-900">{companyInfo.name}</div>
              <div className="company-details text-sm text-gray-600">
                <div>{companyInfo.address}</div>
                <div>GSTIN: {companyInfo.gstin} | Phone: {companyInfo.phone} | Email: {companyInfo.email}</div>
              </div>
              <div className="report-title mt-6">{reportTitle}</div>
              <div className="report-date">
                {customer.name} • {customer.mobile_number}
                {dateFilter !== 'all' && ` • Period: ${dateFilter === 'custom' ? `${customStartDate} to ${customEndDate}` : dateFilter}`}
              </div>
            </div>

            {/* Customer Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Customer Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-gray-600">{customer.address}</p>
                </div>
                <div>
                  <p className="text-gray-600">Mobile: {customer.mobile_number}</p>
                  {customer.gstin && <p className="text-gray-600">GSTIN: {customer.gstin}</p>}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="summary mb-6">
              <div className="summary-item">
                <div className="summary-label">Opening Balance</div>
                <div className={`summary-value ${openingBalanceType === 'receivable' ? 'receivable' : 'payable'}`}>
                  {formatCurrency(openingBalance)}
                  {openingBalanceType === 'receivable' ? ' Dr' : ' Cr'}
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Total Credit</div>
                <div className="summary-value receivable">{formatCurrency(totals.credit)}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Total Debit</div>
                <div className="summary-value payable">{formatCurrency(totals.debit)}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Closing Balance</div>
                <div className={`summary-value ${closingBalanceType === 'receivable' ? 'receivable' : 'payable'}`}>
                  {formatCurrency(Math.abs(closingBalance))}
                  {closingBalanceType === 'receivable' ? ' Dr' : ' Cr'}
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Date</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r border-gray-300">Ref No.</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-r border-gray-300">Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-r border-gray-300">Credit</th>
                  {showRunningBalance && (
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Balance</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {includeOpeningBalance && openingBalance > 0 && (
                  <tr className="bg-blue-50">
                    <td className="px-3 py-2 text-xs text-gray-700 border-r border-gray-200 border-b border-gray-100">{formatDate('2024-01-01')}</td>
                    <td className="px-3 py-2 text-center border-r border-gray-200 border-b border-gray-100">
                      <span className={cn('type-badge', getTypeColor('opening'))}>OPENING</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 border-r border-gray-200 border-b border-gray-100">Opening Balance</td>
                    <td className="px-3 py-2 text-left text-xs font-mono text-gray-500 border-r border-gray-200 border-b border-gray-100">OB-001</td>
                    <td className="px-3 py-2 text-right text-xs border-r border-gray-200 border-b border-gray-100">-</td>
                    <td className="px-3 py-2 text-right text-xs font-medium text-green-600 border-r border-gray-200 border-b border-gray-100">{formatCurrency(openingBalance)}</td>
                    {showRunningBalance && (
                      <td className="px-3 py-2 text-right text-xs font-medium text-blue-600 border-b border-gray-100">{formatCurrency(openingBalance)}</td>
                    )}
                  </tr>
                )}
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-700 border-r border-gray-200 border-b border-gray-100">{formatDate(txn.transaction_date)}</td>
                    <td className="px-3 py-2 text-center border-r border-gray-200 border-b border-gray-100">
                      <span className={cn('type-badge', getTypeColor(txn.transaction_type))}>
                        {getTypeLabel(txn.transaction_type).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 border-r border-gray-200 border-b border-gray-100">{txn.description}</td>
                    <td className="px-3 py-2 text-left text-xs font-mono text-gray-500 border-r border-gray-200 border-b border-gray-100">{txn.reference_number}</td>
                    <td className="px-3 py-2 text-right text-xs border-r border-gray-200 border-b border-gray-100">
                      {['debit', 'payment', 'sales_return', 'purchase_return'].includes(txn.transaction_type)
                        ? formatCurrency(txn.amount)
                        : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-xs border-r border-gray-200 border-b border-gray-100">
                      {['credit', 'opening', 'adjustment'].includes(txn.transaction_type)
                        ? formatCurrency(txn.amount)
                        : '-'}
                    </td>
                    {showRunningBalance && (
                      <td className="px-3 py-2 text-right text-xs font-medium text-blue-600 border-b border-gray-100">
                        {formatCurrency(txn.running_balance)}
                      </td>
                    )}
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={showRunningBalance ? 7 : 6} className="text-center py-8 text-gray-500">No transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Closing Balance */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-right">
              <p className="text-sm text-gray-600">Closing Balance</p>
              <p className={`text-2xl font-bold ${closingBalanceType === 'receivable' ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(closingBalance))}
                {closingBalanceType === 'receivable' ? ' Dr' : ' Cr'}
              </p>
            </div>

            {/* Footer */}
            <div className="footer mt-8 pt-6 border-t border-gray-300">
              <p>Generated by {companyInfo.name} • {new Date().toLocaleString()}</p>
              <p className="mt-1">This is a computer-generated statement.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}