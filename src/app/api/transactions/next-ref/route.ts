import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/server';

/**
 * Generates next reference number based on format template.
 * Supported tokens: {YYYY}, {YY}, {MM}, {DD}, {SEQ}, {SEQ3}, {SEQ4}, {SEQ5}
 *
 * GET /api/transactions/next-ref?type=invoice   → uses invoice_number_format
 * GET /api/transactions/next-ref?type=receipt   → uses receipt_number_format
 * GET /api/transactions/next-ref?type=payment   → uses receipt_number_format
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'invoice';

    // 1. Fetch business settings for the format template
    const { data: settings } = await supabase
      .from('business_settings')
      .select('invoice_number_format, receipt_number_format')
      .eq('business_id', businessId)
      .single();

    const invoiceFormat = settings?.invoice_number_format || 'INV-{YYYY}-{SEQ}';
    const receiptFormat = settings?.receipt_number_format || 'RCP-{YYYY}-{SEQ}';

    const format = (type === 'receipt' || type === 'payment') ? receiptFormat : invoiceFormat;

    // 2. Count existing transactions for this business in current year to get next seq
    const now = new Date();
    const year = now.getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('transaction_date', yearStart)
      .lte('transaction_date', yearEnd)
      .is('deleted_at', null);

    const nextSeq = (count || 0) + 1;

    // 3. Apply format tokens
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const yy = String(year).slice(-2);

    const referenceNumber = format
      .replace('{YYYY}', String(year))
      .replace('{YY}', yy)
      .replace('{MM}', month)
      .replace('{DD}', day)
      .replace('{SEQ5}', String(nextSeq).padStart(5, '0'))
      .replace('{SEQ4}', String(nextSeq).padStart(4, '0'))
      .replace('{SEQ3}', String(nextSeq).padStart(3, '0'))
      .replace('{SEQ}', String(nextSeq).padStart(3, '0'));

    return NextResponse.json({
      reference_number: referenceNumber,
      sequence: nextSeq,
      format,
      year,
    });
  } catch (error) {
    console.error('Next-ref GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
