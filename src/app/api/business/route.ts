import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);

    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error || !business) {
      return NextResponse.json(
        { error: { message: 'Business not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Business GET error:', error);
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
      'name',
      'logo_url',
      'mobile_number',
      'whatsapp_number',
      'email',
      'address',
      'city',
      'state',
      'pin_code',
      'gstin',
      'business_type',
      'currency',
      'default_language',
    ];

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }

    const { data: business, error } = await supabase
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { message: error.message || 'Failed to update business' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ business });
  } catch (error) {
    console.error('Business PUT error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);

    // Delete related records (Supabase RLS/Constraints might need handling if not cascading)
    // Deleting the business record itself will cascade delete related records if set up with ON DELETE CASCADE in the database.
    // If NOT set to cascade, we would need to delete children first.
    // Based on schema, 'transactions', 'customers', 'products', 'product_categories', 'payment_receipts', 'whatsapp_messages', 'business_settings', 'audit_logs'
    // all have 'ON DELETE CASCADE' on 'business_id'.

    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId);

    if (error) {
      console.error('Business DELETE error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to delete business data' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'All business data deleted successfully' });
  } catch (error) {
    console.error('Business DELETE error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
