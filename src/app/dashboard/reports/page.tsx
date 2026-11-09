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

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'outstanding' | 'daily' | 'monthly' | 'sales' | 'gst'>('outstanding');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filterType, setFilterType] = useState<'all' | 'receivable' | 'payable' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadOutstandingReport() {
      try {
        setLoading(true);
        const headers = await (async () => {
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
        })();
        const response = await fetch('/api/reports/outstanding', { headers });
        if (response.ok) {
          const data = await response.json();
          if (data?.outstanding) {
            setOutstandingData(data.outstanding);
            setOutstandingSummary(data.summary || {
              total_receivable: 0,
              total_payable: 0,
              overdue_count: 0,
              total_customers: 0,
            });
          }
        }
      } catch (e) {
        console.error('Failed to load outstanding report:', e);
      } finally {
        setLoading(false);
      }
    }
    loadOutstandingReport();
  }, []);

  useEffect(() => {
    async function loadDailyReport() {
      try {
        setLoading(true);
        const headers = await (async () => {
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
        })();
        const response = await fetch('/api/reports/daily', { headers });
        if (response.ok) {
          const data = await response.json();
          if (data?.daily) {
            setDailyData(data.daily);
          }
        }
      } catch (e) {
        console.error('Failed to load daily report:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDailyReport();
  }, []);

  useEffect(() => {
    async function loadMonthlyReport() {
      try {
        setLoading(true);
        const headers = await (async () => {
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
        })();
        const response = await fetch('/api/reports/monthly', { headers });
        if (response.ok) {
          const data = await response.json();
          if (data?.monthly) {
            setMonthlyData(data.monthly);
          }
        }
      } catch (e) {
        console.error('Failed to load monthly report:', e);
      } finally {
        setLoading(false);
      }
    }
    loadMonthlyReport();
  }, []);

  const [outstandingData, setOutstandingData] = useState<OutstandingReport[]>([]);
  const [outstandingSummary, setOutstandingSummary] = useState({
    total_receivable: 0,
    total_payable: 0,
    overdue_count: 0,
    total_customers: 0,
  });

  const [dailyData, setDailyData] = useState<DailyReport[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyReport[]>([]);

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