import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { transactionUpdateSchema } from '@/lib/validation/schemas';

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

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customers (
          id,
          name,
          mobile_number
        )
      `)
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .single();

    if (error || !transaction) {
      return NextResponse.json(
        { error: { message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Transaction GET error:', error);
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
    const validation = transactionUpdateSchema.safeParse(body);
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

    // Check if transaction exists and belongs to business
    const { data: existing } = await supabase
      .from('transactions')
      .select(`
        id,
        customer_id
      `)
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Transaction not found' } },
        { status: 404 }
      );
    }

    // If customer_id is being changed, verify it belongs to business
    if (body.customer_id && body.customer_id !== (existing as any).customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('id', body.customer_id)
        .eq('business_id', membership.business_id)
        .single();

      if (!customer) {
        return NextResponse.json(
          { error: { message: 'Customer not found in this business' } },
          { status: 404 }
        );
      }
    }

    // Update transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .update({
        ...validation.data,
        reference_number: body.reference_number || null,
        payment_method: body.payment_method || null,
      })
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .select()
      .single();

    if (error) {
      console.error('Transaction update error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to update transaction' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Transaction PUT error:', error);
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

    // Soft delete - set deleted_at
    const { error } = await supabase
      .from('transactions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', membership.business_id);

    if (error) {
      console.error('Transaction delete error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to delete transaction' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Transaction DELETE error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}