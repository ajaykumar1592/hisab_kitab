import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { transactionUpdateSchema, transactionItemSchema, transactionItemUpdateSchema } from '@/lib/validation/schemas';

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
          mobile_number,
          address,
          city,
          state,
          pin_code,
          gstin
        ),
        transaction_items (*)
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

    // Sort items by sort_order
    if (transaction.transaction_items) {
      transaction.transaction_items.sort((a: any, b: any) => a.sort_order - b.sort_order);
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

    // Calculate transaction totals from items if provided
    let subtotal = 0;
    let discountAmount = 0;
    let taxableAmount = 0;
    let totalGst = 0;
    let grandTotal = 0;

    const items = validation.data.items || [];

    if (items.length > 0) {
      for (const item of items) {
        const lineSubtotal = item.quantity * item.rate;
        let itemDiscount = 0;

        if (item.discount_type === 'percentage') {
          itemDiscount = (lineSubtotal * item.discount_value) / 100;
        } else if (item.discount_type === 'fixed') {
          itemDiscount = item.discount_value;
        }

        const itemTaxable = lineSubtotal - itemDiscount;
        const itemGst = (itemTaxable * item.gst_percentage) / 100;
        const itemTotal = itemTaxable + itemGst;

        subtotal += lineSubtotal;
        discountAmount += itemDiscount;
        taxableAmount += itemTaxable;
        totalGst += itemGst;
        grandTotal += itemTotal;
      }
    }

    // Apply transaction-level discount if any
    let finalDiscountAmount = discountAmount;
    let finalTaxableAmount = taxableAmount;
    let finalTotalGst = totalGst;
    let finalGrandTotal = grandTotal;

    const discountType = validation.data.discount_type || 'none';
    const discountValue = validation.data.discount_value || 0;

    if (discountType !== 'none' && discountValue > 0 && taxableAmount > 0) {
      if (discountType === 'percentage') {
        const txnDiscount = (taxableAmount * discountValue) / 100;
        finalDiscountAmount += txnDiscount;
        finalTaxableAmount -= txnDiscount;
        finalTotalGst = (finalTaxableAmount * totalGst) / taxableAmount;
        finalGrandTotal = finalTaxableAmount + finalTotalGst;
      } else if (discountType === 'fixed') {
        finalDiscountAmount += discountValue;
        finalTaxableAmount -= discountValue;
        finalTotalGst = (finalTaxableAmount * totalGst) / taxableAmount;
        finalGrandTotal = finalTaxableAmount + finalTotalGst;
      }
    }

    // Use grand_total as the main amount field for backward compatibility
    const transactionAmount = items.length > 0 ? finalGrandTotal : validation.data.amount;

    // Update transaction
    const { data: transaction, error } = await supabase
      .from('transactions')
      .update({
        ...validation.data,
        reference_number: body.reference_number || null,
        payment_method: body.payment_method || null,
        amount: transactionAmount,
        discount_type: discountType,
        discount_value: discountValue,
        subtotal: items.length > 0 ? subtotal : undefined,
        discount_amount: items.length > 0 ? finalDiscountAmount : undefined,
        taxable_amount: items.length > 0 ? finalTaxableAmount : undefined,
        total_gst: items.length > 0 ? finalTotalGst : undefined,
        grand_total: items.length > 0 ? finalGrandTotal : undefined,
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

    // Handle transaction items update if provided
    if (body.items && Array.isArray(body.items)) {
      // Delete existing items
      await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', id);

      // Insert new items
      const transactionItems = body.items.map((item: any, index: number) => ({
        business_id: membership.business_id,
        transaction_id: id,
        product_id: item.product_id || null,
        item_name: item.item_name,
        item_code: item.item_code || null,
        description: item.description || null,
        unit: item.unit,
        quantity: item.quantity,
        rate: item.rate,
        gst_percentage: item.gst_percentage || 0,
        discount_type: item.discount_type || 'none',
        discount_value: item.discount_value || 0,
        sort_order: item.sort_order || index,
      }));

      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(transactionItems);

      if (itemsError) {
        console.error('Transaction items update error:', itemsError);
      }
    }

    // Fetch the complete transaction with items for response
    const { data: completeTransaction } = await supabase
      .from('transactions')
      .select(`
        *,
        customers (
          id,
          name,
          mobile_number,
          address,
          city,
          state,
          pin_code,
          gstin
        ),
        transaction_items (*)
      `)
      .eq('id', id)
      .single();

    if (completeTransaction?.transaction_items) {
      completeTransaction.transaction_items.sort((a: any, b: any) => a.sort_order - b.sort_order);
    }

    return NextResponse.json({ transaction: completeTransaction });
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

    // Soft delete - set deleted_at (cascade will handle transaction_items)
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