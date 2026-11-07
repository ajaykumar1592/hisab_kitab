'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from '@/components/ui/table';
import Link from 'next/link';
import { Download, Loader2, Calendar, FileText, BarChart2, TrendingUp, AlertTriangle, Eye } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface OutstandingReport {
  customer_id: string;
  customer_name: string;
  mobile_number: string;
  address: string;
  opening_balance: number;
  total_credit: number;
  total_debit: number;
  closing_balance: number;
  balance_type: 'receivable' | 'payable';
  last_transaction_date: string;
  days_overdue: number;
}

interface DailyReport {
  date: string;
  total_sales: number;
  total_purchases: number;
  total_payments_received: number;
  total_payments_made: number;
  net_cash_flow: number;
  transaction_count: number;
}

interface MonthlyReport {
  month: string;
  total_sales: number;
  total_purchases: number;
  total_payments_received: number;
  total_payments_made: number;
  opening_outstanding: number;
  closing_outstanding: number;
  new_customers: number;
}

const mockOutstandingData: OutstandingReport[] = [
  {
    customer_id: '1',
    customer_name: 'Rajesh Kumar',
    mobile_number: '9876543210',
    address: 'Mumbai, Maharashtra',
    opening_balance: 5000,
    total_credit: 45000,
    total_debit: 15000,
    closing_balance: 35000,
    balance_type: 'receivable',
    last_transaction_date: '2024-01-15',
    days_overdue: 15,
  },
  {
    customer_id: '2',
    customer_name: 'Priya Sharma',
    mobile_number: '9876543211',
    address: 'Delhi, Delhi',
    opening_balance: -2000,
    total_credit: 25000,
    total_debit: 30000,
    closing_balance: 3000,
    balance_type: 'payable',
    last_transaction_date: '2024-01-10',
    days_overdue: 0,
  },
  {
    customer_id: '3',
    customer_name: 'Amit Patel',
    mobile_number: '9876543212',
    address: 'Ahmedabad, Gujarat',
    opening_balance: 10000,
    total_credit: 60000,
    total_debit: 45000,
    closing_balance: 25000,
    balance_type: 'receivable',
    last_transaction_date: '2024-01-16',
    days_overdue: 5,
  },
  {
    customer_id: '4',
    customer_name: 'Vikram Reddy',
    mobile_number: '9876543213',
    address: 'Hyderabad, Telangana',
    opening_balance: 0,
    total_credit: 15000,
    total_debit: 8000,
    closing_balance: 7000,
    balance_type: 'receivable',
    last_transaction_date: '2024-01-14',
    days_overdue: 0,
  },
  {
    customer_id: '5',
    customer_name: 'Sunita Devi',
    mobile_number: '9876543214',
    address: 'Bangalore, Karnataka',
    opening_balance: -5000,
    total_credit: 10000,
    total_debit: 20000,
    closing_balance: 5000,
    balance_type: 'payable',
    last_transaction_date: '2024-01-05',
    days_overdue: 0,
  },
];

const mockDailyData: DailyReport[] = [
  { date: '2024-01-16', total_sales: 25000, total_purchases: 5000, total_payments_received: 15000, total_payments_made: 3000, net_cash_flow: 12000, transaction_count: 8 },
  { date: '2024-01-15', total_sales: 18000, total_purchases: 8000, total_payments_received: 12000, total_payments_made: 2000, net_cash_flow: 8000, transaction_count: 6 },
  { date: '2024-01-14', total_sales: 30000, total_purchases: 10000, total_payments_received: 20000, total_payments_made: 5000, net_cash_flow: 15000, transaction_count: 10 },
  { date: '2024-01-13', total_sales: 12000, total_purchases: 3000, total_payments_received: 8000, total_payments_made: 1000, net_cash_flow: 8000, transaction_count: 5 },
  { date: '2024-01-12', total_sales: 22000, total_purchases: 6000, total_payments_received: 15000, total_payments_made: 4000, net_cash_flow: 11000, transaction_count: 7 },
];

const mockMonthlyData: MonthlyReport[] = [
  { month: '2024-01', total_sales: 450000, total_purchases: 120000, total_payments_received: 380000, total_payments_made: 95000, opening_outstanding: 50000, closing_outstanding: 70000, new_customers: 8 },
  { month: '2023-12', total_sales: 420000, total_purchases: 110000, total_payments_received: 400000, total_payments_made: 90000, opening_outstanding: 45000, closing_outstanding: 50000, new_customers: 6 },
  { month: '2023-11', total_sales: 380000, total_purchases: 100000, total_payments_received: 350000, total_payments_made: 85000, opening_outstanding: 40000, closing_outstanding: 45000, new_customers: 5 },
  { month: '2023-10', total_sales: 350000, total_purchases: 95000, total_payments_received: 330000, total_payments_made: 80000, opening_outstanding: 35000, closing_outstanding: 40000, new_customers: 4 },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'outstanding' | 'daily' | 'monthly' | 'sales' | 'gst'>('outstanding');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterType, setFilterType] = useState<'all' | 'receivable' | 'payable' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Summary calculations for outstanding
  const outstandingSummary = {
    total_receivable: mockOutstandingData.filter(d => d.balance_type === 'receivable').reduce((sum, d) => sum + d.closing_balance, 0),
    total_payable: mockOutstandingData.filter(d => d.balance_type === 'payable').reduce((sum, d) => sum + d.closing_balance, 0),
    overdue_count: mockOutstandingData.filter(d => d.days_overdue > 0).length,
    total_customers: mockOutstandingData.length,
  };

  const filteredOutstanding = mockOutstandingData.filter(item => {
    if (filterType !== 'all' && filterType !== item.balance_type && !(filterType === 'overdue' && item.days_overdue > 0)) {
      return false;
    }
    if (searchTerm && !item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !item.mobile_number.includes(searchTerm)) {
      return false;
    }
    return true;
  });

  const getAgingBucket = (days: number) => {
    if (days <= 0) return 'Current';
    if (days <= 30) return '1-30 Days';
    if (days <= 60) return '31-60 Days';
    if (days <= 90) return '61-90 Days';
    return '90+ Days';
  };

  const handleExport = (type: string) => {
    // In real app: call API to download CSV/Excel
    alert(`Exporting ${type} report...`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">View business insights and financial reports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('outstanding')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <Label>Date Range</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-[160px]"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="date"
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-[160px]"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="receivable">Receivable</SelectItem>
                <SelectItem value="payable">Payable</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search customer..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="outstanding">
            <FileText className="mr-2 h-4 w-4" />
            Outstanding
          </TabsTrigger>
          <TabsTrigger value="daily">
            <Calendar className="mr-2 h-4 w-4" />
            Daily
          </TabsTrigger>
          <TabsTrigger value="monthly">
            <BarChart2 className="mr-2 h-4 w-4" />
            Monthly
          </TabsTrigger>
          <TabsTrigger value="sales">
            <TrendingUp className="mr-2 h-4 w-4" />
            Sales Register
          </TabsTrigger>
          <TabsTrigger value="gst">
            <AlertTriangle className="mr-2 h-4 w-4" />
            GST
          </TabsTrigger>
        </TabsList>

        {/* Outstanding Report */}
        <TabsContent value="outstanding" className="mt-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Receivable</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(outstandingSummary.total_receivable)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Payable</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(outstandingSummary.total_payable)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Net Outstanding</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(outstandingSummary.total_receivable - outstandingSummary.total_payable)}
                    </p>
                  </div>
                  <BarChart2 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Overdue Customers</p>
                    <p className="text-2xl font-bold text-orange-600">{outstandingSummary.overdue_count}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Outstanding Table */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Outstanding Report</CardTitle>
              <CardDescription>{filteredOutstanding.length} customers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Total Credit</TableHead>
                    <TableHead className="text-right">Total Debit</TableHead>
                    <TableHead className="text-right">Closing</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Aging</TableHead>
                    <TableHead className="text-center">Last Txn</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOutstanding.map((item) => (
                    <TableRow key={item.customer_id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div>
                          <p>{item.customer_name}</p>
                          <p className="text-xs text-gray-500">{item.mobile_number}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(item.opening_balance)}
                        {item.opening_balance && item.balance_type === 'receivable' ? ' Dr' : item.opening_balance ? ' Cr' : ''}
                      </TableCell>
                      <TableCell className="text-right text-sm text-red-600">
                        {formatCurrency(item.total_credit)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-green-600">
                        {formatCurrency(item.total_debit)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={cn(
                          item.balance_type === 'receivable' ? 'text-red-600' : 'text-green-600'
                        )}>
                          {formatCurrency(item.closing_balance)}
                          {item.balance_type === 'receivable' ? ' Dr' : ' Cr'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.balance_type === 'receivable' ? 'destructive' : 'success'}>
                          {item.balance_type === 'receivable' ? 'Receivable' : 'Payable'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.days_overdue > 0 ? 'warning' : 'default'}>
                          {getAgingBucket(item.days_overdue)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-500">
                        {formatDate(item.last_transaction_date)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/customers/${item.customer_id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t">
              <div className="text-sm text-gray-500">
                Total Receivable: <span className="font-medium text-red-600">{formatCurrency(outstandingSummary.total_receivable)}</span>{' '}
                | Total Payable: <span className="font-medium text-green-600">{formatCurrency(outstandingSummary.total_payable)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleExport('outstanding')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Daily Report */}
        <TabsContent value="daily" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Transaction Summary</CardTitle>
              <CardDescription>Day-wise sales, purchases, and cash flow</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead className="text-right">Payments Received</TableHead>
                    <TableHead className="text-right">Payments Made</TableHead>
                    <TableHead className="text-right">Net Cash Flow</TableHead>
                    <TableHead className="text-center">Transactions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockDailyData.map((item, i) => (
                    <TableRow key={i} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{formatDate(item.date)}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">{formatCurrency(item.total_sales)}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatCurrency(item.total_purchases)}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">{formatCurrency(item.total_payments_received)}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCurrency(item.total_payments_made)}</TableCell>
                      <TableCell className="text-right font-bold" style={{ color: item.net_cash_flow >= 0 ? 'green' : 'red' }}>
                        {formatCurrency(item.net_cash_flow)}
                      </TableCell>
                      <TableCell className="text-center text-gray-600">{item.transaction_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-end border-t">
              <Button variant="outline" onClick={() => handleExport('daily')}>
                <Download className="mr-2 h-4 w-4" />
                Export Daily Report
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Monthly Report */}
        <TabsContent value="monthly" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Business Summary</CardTitle>
              <CardDescription>Month-wise performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Total Purchases</TableHead>
                    <TableHead className="text-right">Payments Received</TableHead>
                    <TableHead className="text-right">Payments Made</TableHead>
                    <TableHead className="text-right">Opening Outstanding</TableHead>
                    <TableHead className="text-right">Closing Outstanding</TableHead>
                    <TableHead className="text-center">New Customers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockMonthlyData.map((item, i) => (
                    <TableRow key={i} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{item.month}</TableCell>
                      <TableCell className="text-right text-red-600 font-medium">{formatCurrency(item.total_sales)}</TableCell>
                      <TableCell className="text-right text-orange-600">{formatCurrency(item.total_purchases)}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">{formatCurrency(item.total_payments_received)}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCurrency(item.total_payments_made)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.opening_outstanding)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.closing_outstanding)}</TableCell>
                      <TableCell className="text-center text-gray-600">{item.new_customers}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-end border-t">
              <Button variant="outline" onClick={() => handleExport('monthly')}>
                <Download className="mr-2 h-4 w-4" />
                Export Monthly Report
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Sales Register */}
        <TabsContent value="sales" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Register</CardTitle>
              <CardDescription>Detailed sales transactions (Credit sales)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Sales Register coming soon</p>
                <p className="text-sm">Detailed invoice-wise sales report with GST breakdown</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GST Report */}
        <TabsContent value="gst" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GST Reports</CardTitle>
              <CardDescription>GSTR-1, GSTR-3B and other GST compliance reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-blue-800 mb-2">GSTR-1 Report</h4>
                    <p className="text-sm text-blue-700 mb-4">B2B, B2C, Export invoices with HSN summary</p>
                    <Button variant="outline" className="w-full" onClick={() => handleExport('gstr1')}>
                      Generate GSTR-1
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-green-800 mb-2">GSTR-3B Report</h4>
                    <p className="text-sm text-green-700 mb-4">Monthly summary return with ITC</p>
                    <Button variant="outline" className="w-full" onClick={() => handleExport('gstr3b')}>
                      Generate GSTR-3B
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-purple-800 mb-2">HSN Summary</h4>
                    <p className="text-sm text-purple-700 mb-4">HSN-wise sales summary for GST filing</p>
                    <Button variant="outline" className="w-full" onClick={() => handleExport('hsn')}>
                      Generate HSN Summary
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-orange-800 mb-2">ITC Register</h4>
                    <p className="text-sm text-orange-700 mb-4">Input Tax Credit claimable on purchases</p>
                    <Button variant="outline" className="w-full" onClick={() => handleExport('itc')}>
                      Generate ITC Register
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}