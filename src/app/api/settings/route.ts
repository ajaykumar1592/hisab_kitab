import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);

    const { data: settings, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Settings fetch error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch settings' } },
        { status: 500 }
      );
    }

    // Return defaults if no settings row yet
    const defaults = {
      business_id: businessId,
      default_currency: 'INR',
      default_language: 'en',
      financial_year_start: null,
      receipt_number_format: 'RCP-{YYYY}-{SEQ}',
      invoice_number_format: 'INV-{YYYY}-{SEQ}',
      whatsapp_enabled: false,
      email_enabled: false,
    };

    return NextResponse.json({ settings: settings || defaults });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);
    const body = await request.json();

    const allowedFields = [
      'default_currency',
      'default_language',
      'financial_year_start',
      'receipt_number_format',
      'invoice_number_format',
      'whatsapp_enabled',
      'email_enabled',
    ];

    const updateData: Record<string, unknown> = {
      business_id: businessId,
      updated_at: new Date().toISOString(),
    };

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    // Upsert (insert if not exists, update if exists)
    const { data: settings, error } = await supabase
      .from('business_settings')
      .upsert(updateData, { onConflict: 'business_id' })
      .select()
      .single();

    if (error) {
      console.error('Settings save error:', error);
      return NextResponse.json(
        { error: { message: error.message || 'Failed to save settings' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
