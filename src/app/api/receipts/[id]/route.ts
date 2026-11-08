import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

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

    const { id } = await params;

    const { data: receipt, error } = await supabase
      .from('payment_receipts')
      .select(`
        *,
        customers (
          id,
          name,
          mobile_number,
          address,
          gstin,
          email
        )
      `)
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .single();

    if (error || !receipt) {
      return NextResponse.json(
        { error: { message: 'Receipt not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      receipt: {
        ...receipt,
        customer_name: receipt.customers?.name,
        customer_mobile: receipt.customers?.mobile_number,
        customer_address: receipt.customers?.address,
        customer_gstin: receipt.customers?.gstin,
        customer_email: receipt.customers?.email,
      },
    });
  } catch (error) {
    console.error('Receipt GET error:', error);
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

    const { id } = await params;

    const { data: receipt, error } = await supabase
      .from('payment_receipts')
      .delete()
      .eq('id', id)
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