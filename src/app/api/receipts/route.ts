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
    const search = searchParams.get('search');
    const paymentMethod = searchParams.get('payment_method');
    const status = searchParams.get('status');
    const dateFilter = searchParams.get('date_filter');
    const customStartDate = searchParams.get('custom_start_date');
    const customEndDate = searchParams.get('custom_end_date');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let dbQuery = supabase
      .from('payment_receipts')
      .select(`
        *,
        customers (
          id,
          name,
          mobile_number
        )
      `)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null);

    if (search) {
      dbQuery = dbQuery.or(`receipt_number.ilike.%${search}%,reference_number.ilike.%${search}%,customers.name.ilike.%${search}%,customers.mobile_number.ilike.%${search}%`);
    }

    if (paymentMethod) {
      dbQuery = dbQuery.eq('payment_method', paymentMethod);
    }

    if (status) {
      dbQuery = dbQuery.eq('status', status);
    }

    if (dateFilter && dateFilter !== 'custom') {
      const now = new Date();
      let start: Date | undefined;
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
      }
      if (start) {
        dbQuery = dbQuery.gte('receipt_date', start.toISOString().split('T')[0])
          .lte('receipt_date', end.toISOString().split('T')[0]);
      }
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      dbQuery = dbQuery.gte('receipt_date', customStartDate)
        .lte('receipt_date', customEndDate);
    }

    dbQuery = dbQuery.order('receipt_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: receipts, error, count } = await dbQuery;

    if (error) {
      console.error('Receipts fetch error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch receipts' } },
        { status: 500 }
      );
    }

    // Transform data
    const transformedReceipts = (receipts || []).map(r => ({
      ...r,
      customer_name: r.customers?.name,
      customer_mobile: r.customers?.mobile_number,
    }));

    return NextResponse.json({
      receipts: transformedReceipts,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Receipts GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Validate required fields
    if (!body.customer_id || !body.receipt_date || !body.amount || !body.payment_method) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    // Verify customer belongs to business
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, mobile_number, address, gstin')
      .eq('id', body.customer_id)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: { message: 'Customer not found' } },
        { status: 404 }
      );
    }

    // Generate receipt number
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('payment_receipts')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', membership.business_id)
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`);

    const receiptNumber = `RCP-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    // Create receipt
    const { data: receipt, error } = await supabase
      .from('payment_receipts')
      .insert({
        business_id: membership.business_id,
        customer_id: body.customer_id,
        receipt_number: receiptNumber,
        receipt_date: body.receipt_date,
        amount: body.amount,
        payment_method: body.payment_method,
        reference_number: body.reference_number || null,
        description: body.description || null,
        status: 'issued',
      })
      .select()
      .single();

    if (error) {
      console.error('Receipt creation error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to create receipt' } },
        { status: 500 }
      );
    }

    // Update customer balance if needed (payment received reduces receivable)
    if (body.payment_method && ['cash', 'upi', 'bank_transfer', 'cheque'].includes(body.payment_method)) {
      // Create a payment transaction record
      await supabase
        .from('transactions')
        .insert({
          business_id: membership.business_id,
          customer_id: body.customer_id,
          transaction_date: body.receipt_date,
          transaction_type: 'payment',
          amount: body.amount,
          description: body.description || `Payment received - ${receiptNumber}`,
          reference_number: receiptNumber,
          payment_method: body.payment_method,
        });
    }

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    console.error('Receipts POST error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

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

    const url = new URL(request.url);
    const receiptId = url.pathname.split('/').pop();

    if (!receiptId) {
      return NextResponse.json(
        { error: { message: 'Receipt ID is required' } },
        { status: 400 }
      );
    }

    const { data: receipt, error } = await supabase
      .from('payment_receipts')
      .delete()
      .eq('id', receiptId)
      .eq('business_id', membership.business_id)
      .select()
      .single();

    if (error) {
      console.error('Receipt delete error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to delete receipt', details: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Receipt deleted successfully', receipt });
  } catch (error) {
    console.error('Receipt DELETE error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}