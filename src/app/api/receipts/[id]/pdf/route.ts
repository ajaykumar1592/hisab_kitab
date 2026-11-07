import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { generateReceiptPDF } from '@/lib/pdf/generator';

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

    // Get receipt with customer details
    const { data: receipt, error } = await supabase
      .from('payment_receipts')
      .select(`
        *,
        customers (
          id,
          name,
          mobile_number,
          address,
          gstin
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
      address: business?.address || '',
      gstin: business?.gstin || '',
      phone: business?.mobile_number || '',
      email: business?.email || '',
    };

    const receiptData = {
      receiptNumber: receipt.receipt_number,
      receiptDate: receipt.receipt_date,
      customerName: receipt.customers?.name || '',
      customerMobile: receipt.customers?.mobile_number || '',
      customerAddress: receipt.customers?.address || '',
      customerGstin: receipt.customers?.gstin || '',
      amount: receipt.amount,
      amountInWords: '', // Will be generated in the PDF function
      paymentMethod: receipt.payment_method,
      referenceNumber: receipt.reference_number,
      description: receipt.description,
      mode: 'payment' as const,
    };

    const pdfBytes = await generateReceiptPDF(companyInfo, receiptData);

    return new NextResponse(pdfBytes as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${receipt.receipt_number}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Receipt PDF generation error:', error);
    return NextResponse.json(
      { error: { message: 'Failed to generate PDF' } },
      { status: 500 }
    );
  }
}