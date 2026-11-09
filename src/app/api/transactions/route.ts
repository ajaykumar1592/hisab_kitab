import { NextRequest, NextResponse } from 'next/server';
import { transactionSchema } from '@/lib/validation/schemas';
import { getAuthContext } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const customerId = searchParams.get('customer_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const transactionType = searchParams.get('transaction_type');
    const includeItems = searchParams.get('include_items') === 'true';

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
      .eq('business_id', businessId)
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

    // If include_items is true, fetch transaction items for each transaction
    let transactionsWithItems = transactions || [];
    if (includeItems && transactions && transactions.length > 0) {
      const transactionIds = transactions.map(t => t.id);
      const { data: items, error: itemsError } = await supabase
        .from('transaction_items')
        .select('*')
        .in('transaction_id', transactionIds)
        .order('sort_order', { ascending: true });

      if (!itemsError && items) {
        // Group items by transaction_id
        const itemsByTransaction = items.reduce((acc, item) => {
          if (!acc[item.transaction_id]) {
            acc[item.transaction_id] = [];
          }
          acc[item.transaction_id].push(item);
          return acc;
        }, {} as Record<string, any[]>);

        transactionsWithItems = transactions.map(t => ({
          ...t,
          items: itemsByTransaction[t.id] || [],
        }));
      } else if (itemsError) {
        console.warn('Could not fetch transaction items (table may not exist):', itemsError.message);
      }
    }

    return NextResponse.json({
      transactions: transactionsWithItems,
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
    const { supabase, user, businessId } = await getAuthContext(request);

    const body = await request.json();

    const validation = transactionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('id, name')
      .eq('id', validation.data.customer_id)
      .eq('business_id', businessId)
      .single();

    if (!customer) {
      return NextResponse.json(
        { error: { message: 'Customer not found' } },
        { status: 404 }
      );
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

    if (validation.data.discount_type !== 'none' && validation.data.discount_value > 0) {
      if (validation.data.discount_type === 'percentage') {
        const txnDiscount = (taxableAmount * validation.data.discount_value) / 100;
        finalDiscountAmount += txnDiscount;
        finalTaxableAmount -= txnDiscount;
        finalTotalGst = (finalTaxableAmount * totalGst) / taxableAmount; // Proportional GST reduction
        finalGrandTotal = finalTaxableAmount + finalTotalGst;
      } else if (validation.data.discount_type === 'fixed') {
        finalDiscountAmount += validation.data.discount_value;
        finalTaxableAmount -= validation.data.discount_value;
        finalTotalGst = (finalTaxableAmount * totalGst) / taxableAmount;
        finalGrandTotal = finalTaxableAmount + finalTotalGst;
      }
    }

    // Use grand_total as the main amount field for backward compatibility
    const transactionAmount = items.length > 0 ? finalGrandTotal : validation.data.amount;

    // Generate invoice number for credit/debit transactions
    let invoiceNumber = body.invoice_number || null;
    let invoiceDate = body.invoice_date || null;

    if ((validation.data.transaction_type === 'credit' || validation.data.transaction_type === 'debit') && items.length > 0) {
      if (!invoiceNumber) {
        // Fetch next invoice number from business settings or generate
        const { data: settings } = await supabase
          .from('business_settings')
          .select('invoice_number_format')
          .eq('business_id', businessId)
          .single();

        const format = settings?.invoice_number_format || 'INV-{YYYY}-{SEQ}';
        const year = new Date().getFullYear();

        // Get count of invoices this year
        const { count } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('transaction_type', validation.data.transaction_type)
          .not('invoice_number', 'is', null)
          .gte('created_at', `${year}-01-01`)
          .lt('created_at', `${year + 1}-01-01`);

        const seq = String((count || 0) + 1).padStart(4, '0');
        invoiceNumber = format
          .replace('{YYYY}', String(year))
          .replace('{SEQ}', seq);
      }
      invoiceDate = validation.data.transaction_date.split('T')[0];
    }

    // Build the basic insert payload - only include fields that exist in base schema
    const basicPayload = {
      business_id: businessId,
      customer_id: validation.data.customer_id,
      transaction_date: validation.data.transaction_date,
      transaction_type: validation.data.transaction_type,
      amount: transactionAmount,
      description: validation.data.description || null,
      reference_number: validation.data.reference_number || null,
      payment_method: validation.data.payment_method || null,
      created_by: user?.id || null,
    };

    // Try to insert with all fields (for migrated databases) or basic fields only
    let transaction = null;
    let error = null;

    try {
      // First try with all fields (migrated schema)
      const { data: txn, error: insertError } = await supabase
        .from('transactions')
        .insert({
          ...basicPayload,
          discount_type: validation.data.discount_type || 'none',
          discount_value: validation.data.discount_value || 0,
          subtotal,
          discount_amount: finalDiscountAmount,
          taxable_amount: finalTaxableAmount,
          total_gst: finalTotalGst,
          grand_total: finalGrandTotal,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
        })
        .select()
        .single();

      if (insertError && (insertError.code === '42703' || insertError.message?.includes('column') || insertError.message?.includes('does not exist'))) {
        // Column doesn't exist - insert with basic fields only
        console.log('Column missing, using basic insert:', insertError.message);
        const result = await supabase
          .from('transactions')
          .insert(basicPayload)
          .select()
          .single();
        transaction = result.data;
        error = result.error;
      } else {
        transaction = txn;
        error = insertError;
      }
    } catch (e: any) {
      // Fallback to basic insert
      const result = await supabase
        .from('transactions')
        .insert(basicPayload)
        .select()
        .single();
      transaction = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Transaction creation error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to create transaction', details: error.message, hint: error.hint, code: error.code } },
        { status: 500 }
      );
    }

    // Insert transaction items if provided
    if (items.length > 0 && transaction) {
      const transactionItems = items.map((item, index) => ({
        business_id: businessId,
        transaction_id: transaction.id,
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
        console.error('Transaction items creation error:', itemsError);
      }
    }

    // Fetch the complete transaction with items for response
    let completeTransaction: any = null;
    try {
      const txnResult = await supabase
        .from('transactions')
        .select(`
          *,
          customers (
            id,
            name,
            mobile_number
          )
        `)
        .eq('id', transaction.id)
        .single();

      // Try to fetch transaction_items if table exists
      try {
        const itemsResult = await supabase
          .from('transaction_items')
          .select('*')
          .eq('transaction_id', transaction.id)
          .order('sort_order', { ascending: true });

        if (!itemsResult.error && itemsResult.data) {
          completeTransaction = {
            ...txnResult.data,
            items: itemsResult.data,
          };
        } else {
          completeTransaction = txnResult.data;
        }
      } catch {
        completeTransaction = txnResult.data;
      }
    } catch {
      completeTransaction = { id: transaction.id, business_id: businessId, customer_id: validation.data.customer_id };
    }

    return NextResponse.json({ transaction: completeTransaction }, { status: 201 });
  } catch (error) {
    console.error('Transactions POST error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}