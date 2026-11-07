import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { transactionSchema } from '@/lib/validation/schemas';

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const customerId = searchParams.get('customer_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const transactionType = searchParams.get('transaction_type');

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

    let query = supabase
      .from('transactions')
      .select(`
        *,
        customers (
          id,
          name,
          mobile_number
        )
      `, { count: 'exact' })
      .eq('business_id', membership.business_id)
      .is('deleted_at', null);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate);
    }

    if (transactionType) {
      query = query.eq('transaction_type', transactionType);
    }

    query = query.order('transaction_date', { ascending: false });
    query = query.order('created_at', { ascending: false });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      console.error('Transactions fetch error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch transactions' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      transactions: transactions || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Transactions GET error:', error);
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

    const body = await request.json();

    // Validate input
    const validation = transactionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', details: validation.error.flatten() } },
        { status: 400 }
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

    // Verify customer belongs to business
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name')
      .eq('id', validation.data.customer_id)
      .eq('business_id', membership.business_id)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: { message: 'Customer not found' } },
        { status: 404 }
      );
    }

    // Create transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        ...validation.data,
        business_id: membership.business_id,
        created_by: user.id,
        reference_number: body.reference_number || null,
        payment_method: body.payment_method || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Transaction creation error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to create transaction' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error('Transactions POST error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}