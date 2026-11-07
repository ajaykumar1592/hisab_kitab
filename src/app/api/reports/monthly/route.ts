import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get user's business
    const { data: membership } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: { message: 'No business found' } },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '12');
    const format = searchParams.get('format');

    // Get transactions for the last N months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('transaction_date, transaction_type, amount, customer_id')
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .gte('transaction_date', startDate.toISOString().split('T')[0])
      .lte('transaction_date', endDate.toISOString().split('T')[0])
      .order('transaction_date', { ascending: true });

    if (error) {
      console.error('Monthly report error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch report' } },
        { status: 500 }
      );
    }

    // Get customer creation dates for new customers count
    const { data: customers } = await supabase
      .from('customers')
      .select('id, created_at')
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Group by month
    const monthlyMap = new Map<string, {
      month: string;
      total_sales: number;
      total_purchases: number;
      total_payments_received: number;
      total_payments_made: number;
      new_customers: Set<string>;
    }>();

    (transactions || []).forEach(t => {
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          total_sales: 0,
          total_purchases: 0,
          total_payments_received: 0,
          total_payments_made: 0,
          new_customers: new Set(),
        });
      }
      const month = monthlyMap.get(monthKey)!;

      switch (t.transaction_type) {
        case 'credit':
        case 'opening':
          month.total_sales += Number(t.amount);
          break;
        case 'debit':
          month.total_purchases += Number(t.amount);
          break;
        case 'payment':
          month.total_payments_received += Number(t.amount);
          break;
        case 'adjustment':
        case 'sales_return':
        case 'purchase_return':
          month.total_payments_made += Number(t.amount);
          break;
      }
    });

    // Add new customers
    (customers || []).forEach(c => {
      const date = new Date(c.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap.has(monthKey)) {
        monthlyMap.get(monthKey)!.new_customers.add(c.id);
      }
    });

    // Calculate opening/closing outstanding for each month
    // We need to calculate running balance per customer per month
    const monthlyData = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, data]) => ({
        month: key,
        total_sales: data.total_sales,
        total_purchases: data.total_purchases,
        total_payments_received: data.total_payments_received,
        total_payments_made: data.total_payments_made,
        new_customers: data.new_customers.size,
        opening_outstanding: 0,
        closing_outstanding: 0,
      }));

    // Calculate outstanding balances
    // Get all customer balances at the start of the period
    const { data: openingBalances } = await supabase
      .from('customer_balances')
      .select('customer_id, current_balance')
      .eq('business_id', membership.business_id);

    let runningOutstanding = (openingBalances || []).reduce((sum, b) => sum + Math.abs(Number(b.current_balance || 0)), 0);

    monthlyData.forEach((month, index) => {
      month.opening_outstanding = runningOutstanding;
      const netChange = month.total_sales - month.total_payments_received - month.total_purchases + month.total_payments_made;
      runningOutstanding += netChange;
      month.closing_outstanding = Math.max(0, runningOutstanding);
    });

    // Sort by month descending for display
    monthlyData.sort((a, b) => b.month.localeCompare(a.month));

    // Return CSV if requested
    if (format === 'csv') {
      const csv = generateCSV(monthlyData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="monthly-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      data: monthlyData,
      date_range: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Monthly report GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

function generateCSV(data: any[]): string {
  const headers = [
    'Month',
    'Total Sales',
    'Total Purchases',
    'Payments Received',
    'Payments Made',
    'Opening Outstanding',
    'Closing Outstanding',
    'New Customers',
  ];

  const rows = data.map(d => [
    d.month,
    d.total_sales.toFixed(2),
    d.total_purchases.toFixed(2),
    d.total_payments_received.toFixed(2),
    d.total_payments_made.toFixed(2),
    d.opening_outstanding.toFixed(2),
    d.closing_outstanding.toFixed(2),
    d.new_customers.toString(),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}