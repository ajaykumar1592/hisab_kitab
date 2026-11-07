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
    const filter = searchParams.get('filter'); // all, receivable, payable, overdue
    const search = searchParams.get('search');
    const format = searchParams.get('format'); // json, csv
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query using the customer_balances view
    let query = supabase
      .from('customer_balances')
      .select(`
        customer_id,
        name,
        mobile_number,
        address,
        opening_balance,
        total_credit,
        total_debit,
        current_balance,
        last_transaction_date
      `)
      .eq('business_id', membership.business_id);

    if (search) {
      query = query.or(`name.ilike.%${search}%,mobile_number.ilike.%${search}%`);
    }

    const { data: balances, error } = await query;

    if (error) {
      console.error('Outstanding report error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch report' } },
        { status: 500 }
      );
    }

    // Transform data
    const reportData = (balances || []).map(b => {
      const closingBalance = b.current_balance || 0;
      const balanceType = closingBalance >= 0 ? 'receivable' : 'payable';

      // Calculate days overdue (simplified - would need actual due date logic)
      const lastTxnDate = b.last_transaction_date ? new Date(b.last_transaction_date) : null;
      const daysOverdue = lastTxnDate ? Math.max(0, Math.floor((Date.now() - lastTxnDate.getTime()) / (1000 * 60 * 60 * 24)) - 30) : 0;

      return {
        customer_id: b.customer_id,
        customer_name: b.name,
        mobile_number: b.mobile_number,
        address: b.address,
        opening_balance: Number(b.opening_balance || 0),
        total_credit: Number(b.total_credit || 0),
        total_debit: Number(b.total_debit || 0),
        closing_balance: Math.abs(closingBalance),
        balance_type: balanceType,
        last_transaction_date: b.last_transaction_date || null,
        days_overdue: daysOverdue,
      };
    });

    // Apply filter
    let filteredData = reportData;
    if (filter === 'receivable') {
      filteredData = reportData.filter(d => d.balance_type === 'receivable');
    } else if (filter === 'payable') {
      filteredData = reportData.filter(d => d.balance_type === 'payable');
    } else if (filter === 'overdue') {
      filteredData = reportData.filter(d => d.days_overdue > 0);
    }

    // Sort by closing balance descending
    filteredData.sort((a, b) => b.closing_balance - a.closing_balance);

    // Calculate summary
    const summary = {
      total_receivable: filteredData.filter(d => d.balance_type === 'receivable').reduce((sum, d) => sum + d.closing_balance, 0),
      total_payable: filteredData.filter(d => d.balance_type === 'payable').reduce((sum, d) => sum + d.closing_balance, 0),
      overdue_count: filteredData.filter(d => d.days_overdue > 0).length,
      total_customers: filteredData.length,
    };

    // Return CSV if requested
    if (format === 'csv') {
      const csv = generateCSV(filteredData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="outstanding-report-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      data: filteredData,
      summary,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Outstanding report GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

function generateCSV(data: any[]): string {
  const headers = [
    'Customer Name',
    'Mobile Number',
    'Address',
    'Opening Balance',
    'Total Credit',
    'Total Debit',
    'Closing Balance',
    'Balance Type',
    'Last Transaction Date',
    'Days Overdue',
  ];

  const rows = data.map(d => [
    d.customer_name,
    d.mobile_number,
    d.address || '',
    d.opening_balance.toFixed(2),
    d.total_credit.toFixed(2),
    d.total_debit.toFixed(2),
    d.closing_balance.toFixed(2),
    d.balance_type,
    d.last_transaction_date || '',
    d.days_overdue.toString(),
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}