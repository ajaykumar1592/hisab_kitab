import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

interface TransactionWithCustomer {
  id: string;
  transaction_date: string;
  amount: number;
  description: string | null;
  reference_number: string | null;
  customer_id: string | null;
  customers: {
    id: string;
    name: string | null;
    mobile_number: string | null;
    gstin: string | null;
    address: string | null;
  } | null;
}

interface SalesDataItem {
  id: string;
  date: string;
  invoice_number: string;
  customer_name: string;
  customer_mobile: string;
  customer_gstin: string;
  customer_address: string;
  amount: number;
  description: string;
  taxable_value: number;
  gst_amount: number;
  total_amount: number;
}

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
    const customerId = searchParams.get('customer_id');
    const format = searchParams.get('format');

    // Default to current financial year
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getFullYear(), 3, 1); // April 1st

    // Query credit transactions (sales)
    let query = supabase
      .from('transactions')
      .select(`
        id,
        transaction_date,
        amount,
        description,
        reference_number,
        customer_id,
        customers (
          id,
          name,
          mobile_number,
          gstin,
          address
        )
      `)
      .eq('business_id', membership.business_id)
      .eq('transaction_type', 'credit')
      .is('deleted_at', null)
      .gte('transaction_date', start.toISOString().split('T')[0])
      .lte('transaction_date', end.toISOString().split('T')[0])
      .order('transaction_date', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Sales register error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch report' } },
        { status: 500 }
      );
    }

    // Transform data
    const salesData: SalesDataItem[] = (transactions || []).map(t => {
      const trans = t as unknown as TransactionWithCustomer;
      return {
        id: trans.id,
        date: trans.transaction_date,
        invoice_number: trans.reference_number || `INV-${String(trans.id).slice(0, 8)}`,
        customer_name: trans.customers?.name || 'Unknown',
        customer_mobile: trans.customers?.mobile_number || '',
        customer_gstin: trans.customers?.gstin || '',
        customer_address: trans.customers?.address || '',
        amount: Number(trans.amount),
        description: trans.description || '',
        // GST fields (would come from product details in real implementation)
        taxable_value: Number(trans.amount) / 1.18, // Assuming 18% GST
        gst_amount: Number(trans.amount) * 0.18 / 1.18,
        total_amount: Number(trans.amount),
      };
    });

    // Calculate totals
    const totals = salesData.reduce((acc, item) => {
      acc.total_sales += item.amount;
      acc.total_taxable += item.taxable_value;
      acc.total_gst += item.gst_amount;
      return acc;
    }, { total_sales: 0, total_taxable: 0, total_gst: 0 });

    // Return CSV if requested
    if (format === 'csv') {
      const csv = generateCSV(salesData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sales-register-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      data: salesData,
      totals,
      date_range: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sales register GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

function generateCSV(data: any[]): string {
  const headers = [
    'Date',
    'Invoice No.',
    'Customer Name',
    'Customer Mobile',
    'Customer GSTIN',
    'Customer Address',
    'Taxable Value',
    'GST Amount',
    'Total Amount',
    'Description',
  ];

  const rows = data.map(d => [
    d.date,
    d.invoice_number,
    d.customer_name,
    d.customer_mobile,
    d.customer_gstin,
    d.customer_address?.replace(/,/g, ';') || '',
    d.taxable_value.toFixed(2),
    d.gst_amount.toFixed(2),
    d.total_amount.toFixed(2),
    d.description?.replace(/,/g, ';') || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}