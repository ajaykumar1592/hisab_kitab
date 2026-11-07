import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { customerSchema } from '@/lib/validation/schemas';

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
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'active';
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';

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
      .from('customers')
      .select(`
        *,
        transactions!left (
          id,
          transaction_date,
          transaction_type,
          amount
        )
      `, { count: 'exact' })
      .eq('business_id', membership.business_id);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,mobile_number.ilike.%${search}%`);
    }

    query = query.order(sort, { ascending: order === 'asc' });
    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: customers, error, count } = await query;

    if (error) {
      console.error('Customers fetch error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch customers' } },
        { status: 500 }
      );
    }

    // Calculate balances
    const customersWithBalance = (customers || []).map((customer: any) => {
      const transactions = customer.transactions || [];
      const openingBalance = customer.opening_balance || 0;
      const openingType = customer.opening_balance_type || 'receivable';

      let balance = openingType === 'receivable' ? openingBalance : -openingBalance;

      transactions.forEach((txn: any) => {
        if (['credit', 'opening', 'adjustment'].includes(txn.transaction_type)) {
          balance += txn.amount;
        } else if (['debit', 'payment', 'sales_return', 'purchase_return'].includes(txn.transaction_type)) {
          balance -= txn.amount;
        }
      });

      const lastTxn = transactions.sort((a: any, b: any) =>
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      )[0];

      return {
        ...customer,
        balance,
        last_transaction_date: lastTxn?.transaction_date,
        transactions: undefined,
      };
    });

    return NextResponse.json({
      customers: customersWithBalance,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Customers GET error:', error);
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
    const validation = customerSchema.safeParse(body);
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

    // Check for duplicate mobile number
    if (body.mobile_number) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', membership.business_id)
        .eq('mobile_number', body.mobile_number)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: { message: 'A customer with this mobile number already exists' } },
          { status: 409 }
        );
      }
    }

    // Create customer
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        ...validation.data,
        business_id: membership.business_id,
        mobile_number: body.mobile_number || null,
        alternate_mobile_number: body.alternate_mobile_number || null,
        whatsapp_number: body.whatsapp_number || null,
        business_type: body.business_type || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        pin_code: body.pin_code || null,
        email: body.email || null,
        gstin: body.gstin || null,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Customer creation error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to create customer' } },
        { status: 500 }
      );
    }

    // Create opening balance transaction if > 0
    if (validation.data.opening_balance > 0) {
      await supabase
        .from('transactions')
        .insert({
          business_id: membership.business_id,
          customer_id: customer.id,
          transaction_type: 'opening',
          amount: validation.data.opening_balance,
          description: 'Opening balance',
          created_by: user.id,
        });
    }

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error('Customers POST error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}