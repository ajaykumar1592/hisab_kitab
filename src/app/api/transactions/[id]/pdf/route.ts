import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { generateInvoicePDF, numberToWords } from '@/lib/pdf/generator';

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

    // Get transaction with customer details and items
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

    // Only generate invoice for credit/debit transactions with items
    if (!['credit', 'debit', 'sales_return', 'purchase_return'].includes(transaction.transaction_type)) {
      return NextResponse.json(
        { error: { message: 'Invoice can only be generated for credit/debit transactions' } },
        { status: 400 }
      );
    }

    // Get business settings
    const { data: settings } = await supabase
      .from('business_settings')
      .select('*')
      .eq('business_id', membership.business_id)
      .single();

    // Get business info
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', membership.business_id)
      .single();

    const companyInfo = {
      name: business?.name || 'Hisab Kitab',
      address: [business?.address, business?.city, business?.state, business?.pin_code].filter(Boolean).join(', '),
      gstin: business?.gstin || '',
      phone: business?.mobile_number || '',
      email: business?.email || '',
    };

    // Sort items by sort_order
    const items = (transaction.transaction_items || []).sort((a: any, b: any) => a.sort_order - b.sort_order);

    // Determine if intra-state or inter-state for CGST/SGST vs IGST
    const businessState = business?.state || '';
    const customerState = transaction.customers?.state || '';
    const isInterState = businessState && customerState && businessState !== customerState;

    // Build invoice items
    const invoiceItems = items.map((item: any) => {
      const lineSubtotal = item.quantity * item.rate;
      let discountAmount = 0;

      if (item.discount_type === 'percentage') {
        discountAmount = (lineSubtotal * item.discount_value) / 100;
      } else if (item.discount_type === 'fixed') {
        discountAmount = item.discount_value;
      }

      const taxableAmount = lineSubtotal - discountAmount;
      const gstAmount = (taxableAmount * item.gst_percentage) / 100;
      const lineTotal = taxableAmount + gstAmount;

      // Calculate CGST/SGST or IGST
      const cgst = isInterState ? 0 : gstAmount / 2;
      const sgst = isInterState ? 0 : gstAmount / 2;
      const igst = isInterState ? gstAmount : 0;

      return {
        itemName: item.item_name,
        itemCode: item.item_code || undefined,
        description: item.description || undefined,
        hsnCode: undefined, // Could be extracted from description or added to product
        unit: item.unit,
        quantity: item.quantity,
        rate: item.rate,
        gstPercentage: item.gst_percentage,
        discountType: item.discount_type,
        discountValue: item.discount_value,
        lineSubtotal,
        discountAmount,
        taxableAmount,
        gstAmount,
        lineTotal,
        cgst,
        sgst,
        igst,
      };
    });

    // Calculate totals
    const subtotal = invoiceItems.reduce((sum: number, item: any) => sum + item.lineSubtotal, 0);
    const discountAmount = invoiceItems.reduce((sum: number, item: any) => sum + item.discountAmount, 0);
    const taxableAmount = invoiceItems.reduce((sum: number, item: any) => sum + item.taxableAmount, 0);
    const totalGst = invoiceItems.reduce((sum: number, item: any) => sum + item.gstAmount, 0);
    const cgst = invoiceItems.reduce((sum: number, item: any) => sum + item.cgst, 0);
    const sgst = invoiceItems.reduce((sum: number, item: any) => sum + item.sgst, 0);
    const igst = invoiceItems.reduce((sum: number, item: any) => sum + item.igst, 0);
    const grandTotal = transaction.grand_total || transaction.amount || invoiceItems.reduce((sum: number, item: any) => sum + item.lineTotal, 0);

    const invoiceNumber = transaction.invoice_number || transaction.reference_number || `INV-${id.slice(0, 8)}`;
    const invoiceDate = transaction.invoice_date || transaction.transaction_date;

    const customerName = transaction.customers?.name || '';
    const customerAddress = [
      transaction.customers?.address,
      transaction.customers?.city,
      transaction.customers?.state,
      transaction.customers?.pin_code,
    ].filter(Boolean).join(', ');

    const amountInWords = numberToWords(Math.round(grandTotal));

    const invoiceData = {
      companyInfo,
      invoiceNumber,
      invoiceDate,
      customerName,
      customerMobile: transaction.customers?.mobile_number || '',
      customerAddress,
      customerGstin: transaction.customers?.gstin || '',
      customerState: transaction.customers?.state || '',
      items: invoiceItems,
      subtotal,
      discountAmount,
      taxableAmount,
      totalGst,
      grandTotal,
      cgst,
      sgst,
      igst,
      amountInWords,
      paymentTerms: settings?.payment_terms || 'Payment due within 30 days',
      notes: transaction.description || undefined,
      reverseCharge: false,
      placeOfSupply: customerState || businessState,
    };

    const pdfBytes = await generateInvoicePDF(invoiceData);

    return new NextResponse(pdfBytes as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Invoice PDF generation error:', error);
    return NextResponse.json(
      { error: { message: 'Failed to generate invoice PDF' } },
      { status: 500 }
    );
  }
}