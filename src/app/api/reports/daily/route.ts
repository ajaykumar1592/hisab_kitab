import { getAuthContext } from '@/lib/auth/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const format = searchParams.get('format');

    // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Query transactions grouped by date
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('transaction_date, transaction_type, amount')
      .eq('business_id', businessId)
      .is('deleted_at', null)
      .gte('transaction_date', start.toISOString().split('T')[0])
      .lte('transaction_date', end.toISOString().split('T')[0])
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Daily report error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch report' } },
        { status: 500 }
      );
    }

    // Group by date
    const dailyMap = new Map<string, {
      date: string;
      total_sales: number;
      total_purchases: number;
      total_payments_received: number;
      total_payments_made: number;
      transaction_count: number;
    }>();

    (transactions || []).forEach(t => {
      const date = t.transaction_date;
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          total_sales: 0,
          total_purchases: 0,
          total_payments_received: 0,
          total_payments_made: 0,
          transaction_count: 0,
        });
      }
      const day = dailyMap.get(date)!;
      day.transaction_count++;

      switch (t.transaction_type) {
        case 'credit':
        case 'opening':
          day.total_sales += Number(t.amount);
          break;
        case 'debit':
          day.total_purchases += Number(t.amount);
          break;
        case 'payment':
          day.total_payments_received += Number(t.amount);
          break;
        case 'adjustment':
        case 'sales_return':
        case 'purchase_return':
          day.total_payments_made += Number(t.amount);
          break;
      }
    });

    // Convert to array and calculate net cash flow
    const dailyData = Array.from(dailyMap.values()).map(d => ({
      ...d,
      net_cash_flow: d.total_payments_received - d.total_payments_made,
    }));

    // Sort by date descending
    dailyData.sort((a, b) => b.date.localeCompare(a.date));

    // Return CSV if requested
    if (format === 'csv') {
      const csv = generateCSV(dailyData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="daily-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Calculate stats for dashboard
    const totalReceivable = (transactions || [])
      .filter(t => t.transaction_type === 'credit' || t.transaction_type === 'opening')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalPayable = (transactions || [])
      .filter(t => t.transaction_type === 'debit' || t.transaction_type === 'adjustment' || t.transaction_type === 'purchase_return')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const todayCredit = (transactions || [])
      .filter(t => t.transaction_type === 'credit' || t.transaction_type === 'opening')
      .filter(t => t.transaction_date === new Date().toISOString().split('T')[0])
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const todayDebit = (transactions || [])
      .filter(t => t.transaction_type === 'debit')
      .filter(t => t.transaction_date === new Date().toISOString().split('T')[0])
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const todayPayments = (transactions || [])
      .filter(t => t.transaction_type === 'payment')
      .filter(t => t.transaction_date === new Date().toISOString().split('T')[0])
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Get customers count
    const { data: customers } = await supabase
      .from('customers')
      .select('id', { count: 'exact' })
      .eq('business_id', businessId)
      .is('deleted_at', null);

    // Get outstanding customers
    const { data: outstandingCustomers } = await supabase
      .from('customers')
      .select('id, name, mobile_number')
      .eq('business_id', businessId)
      .is('deleted_at', null);

    // Calculate balances for outstanding
    const customerBalances: any[] = [];
    if (outstandingCustomers) {
      for (const customer of outstandingCustomers) {
        const { data: custTxns } = await supabase
          .from('transactions')
          .select('transaction_type, amount')
          .eq('business_id', businessId)
          .eq('customer_id', customer.id)
          .is('deleted_at', null);

        let balance = 0;
        if (custTxns) {
          custTxns.forEach((t: any) => {
            if (t.transaction_type === 'credit' || t.transaction_type === 'opening') {
              balance += Number(t.amount);
            } else if (t.transaction_type === 'payment') {
              balance -= Number(t.amount);
            } else if (t.transaction_type === 'debit') {
              balance -= Number(t.amount);
            }
          });
        }

        if (balance > 0) {
          customerBalances.push({
            id: customer.id,
            name: customer.name,
            mobile_number: customer.mobile_number,
            balance,
            last_transaction_date: new Date().toISOString().split('T')[0],
          });
        }
      }
    }

    const stats = {
      total_customers: customers?.length || 0,
      total_receivable: totalReceivable,
      total_payable: totalPayable,
      today_credit: todayCredit,
      today_debit: todayDebit,
      today_payments: todayPayments,
      this_month_sales: totalReceivable,
      this_month_payments: 0,
      outstanding_customers: customerBalances.slice(0, 5),
      recent_transactions: dailyData.slice(0, 5).map((d, i) => ({
        id: `recent-${i}`,
        transaction_date: d.date,
        transaction_type: 'credit',
        amount: d.total_sales,
        description: `Sales for ${d.date}`,
        customer_name: 'Customer',
      })),
    };

    return NextResponse.json({
      stats,
      data: dailyData,
      date_range: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Daily report GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

function generateCSV(data: any[]): string {
  const headers = [
    'Date',
    'Total Sales',
    'Total Purchases',
    'Payments Received',
    'Payments Made',
    'Net Cash Flow',
    'Transaction Count',
  ];

  const rows = data.map(d => [
    d.date,
    d.total_sales.toFixed(2),
    d.total_purchases.toFixed(2),
    d.total_payments_received.toFixed(2),
    d.total_payments_made.toFixed(2),
    d.net_cash_flow.toFixed(2),
    d.transaction_count.toString(),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}