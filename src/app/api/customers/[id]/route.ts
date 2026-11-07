import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { customerUpdateSchema } from '@/lib/validation/schemas';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { id } = await params;

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

    const { data: customer, error } = await supabase
      .from('customers')
      .select(`
        *,
        transactions!left (
          id,
          transaction_date,
          transaction_type,
          amount,
          description,
          reference_number,
          payment_method,
          created_at
        )
      `)
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { error: { message: 'Customer not found' } },
        { status: 404 }
      );
    }

    // Calculate balance
    const transactions = customer.transactions || [];
    const openingBalance = customer.opening_balance || 0;
    const openingType = customer.opening_balance_type || 'receivable';

    let balance = openingType === 'receivable' ? openingBalance : -openingBalance;

    const transactionsWithBalance = transactions
      .sort((a: any, b: any) =>
        new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime() ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map((txn: any) => {
        if (['credit', 'opening', 'adjustment'].includes(txn.transaction_type)) {
          balance += txn.amount;
        } else if (['debit', 'payment', 'sales_return', 'purchase_return'].includes(txn.transaction_type)) {
          balance -= txn.amount;
        }
        return { ...txn, running_balance: balance };
      });

    const totals = {
      opening_balance: openingBalance,
      total_credit: transactions
        .filter((t: any) => ['credit', 'opening', 'adjustment'].includes(t.transaction_type))
        .reduce((sum: number, t: any) => sum + t.amount, 0),
      total_debit: transactions
        .filter((t: any) => ['debit', 'payment', 'sales_return', 'purchase_return'].includes(t.transaction_type))
        .reduce((sum: number, t: any) => sum + t.amount, 0),
      current_balance: balance,
    };

    return NextResponse.json({
      customer: {
        ...customer,
        transactions: transactionsWithBalance,
        totals,
        transactions_count: transactions.length,
      },
    });
  } catch (error) {
    console.error('Customer GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = customerUpdateSchema.safeParse(body);
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

    // Check if customer exists and belongs to business
    const { data: existing } = await supabase
      .from('customers')
      .select('id, mobile_number')
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Customer not found' } },
        { status: 404 }
      );
    }

    // Check for duplicate mobile number (if changed)
    if (body.mobile_number && body.mobile_number !== existing.mobile_number) {
      const { data: duplicate } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', membership.business_id)
        .eq('mobile_number', body.mobile_number)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: { message: 'A customer with this mobile number already exists' } },
          { status: 409 }
        );
      }
    }

    // Update customer
    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        ...validation.data,
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
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .select()
      .single();

    if (error) {
      console.error('Customer update error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to update customer' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Customer PUT error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { id } = await params;

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

    // Soft delete - archive customer
    const { error } = await supabase
      .from('customers')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('business_id', membership.business_id);

    if (error) {
      console.error('Customer archive error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to archive customer' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Customer DELETE error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}