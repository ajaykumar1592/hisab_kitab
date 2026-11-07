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
      .eq('business_id', membership.business_id)
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

    return NextResponse.json({
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