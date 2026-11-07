import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
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

    const { data: config, error } = await supabase
      .from('whatsapp_configurations')
      .select('*')
      .eq('business_id', membership.business_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('WhatsApp config fetch error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch configuration' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ config: config || null });
  } catch (error) {
    console.error('WhatsApp config GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
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

    const body = await request.json();

    // Validate required fields if activating
    if (body.is_active) {
      if (!body.phone_number_id || !body.business_account_id || !body.access_token || !body.webhook_verify_token) {
        return NextResponse.json(
          { error: { message: 'Missing required fields for activation' } },
          { status: 400 }
        );
      }
    }

    // Upsert configuration
    const { data: config, error } = await supabase
      .from('whatsapp_configurations')
      .upsert({
        business_id: membership.business_id,
        phone_number_id: body.phone_number_id || null,
        business_account_id: body.business_account_id || null,
        access_token: body.access_token || null,
        webhook_verify_token: body.webhook_verify_token || null,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`,
        is_active: body.is_active || false,
        default_template_namespace: body.default_template_namespace || null,
      })
      .select()
      .single();

    if (error) {
      console.error('WhatsApp config upsert error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to save configuration' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('WhatsApp config PUT error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
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

    const body = await request.json();

    // Test connection to Meta Graph API
    if (!body.phone_number_id || !body.access_token) {
      return NextResponse.json(
        { error: { message: 'Phone Number ID and Access Token required for test' } },
        { status: 400 }
      );
    }

    // Call Meta Graph API to verify credentials
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${body.phone_number_id}`,
      {
        headers: {
          'Authorization': `Bearer ${body.access_token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: {
            message: data.error?.message || 'Failed to connect to WhatsApp API',
            details: data.error
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Connection test successful',
      data: {
        display_phone_number: data.display_phone_number,
        verified_name: data.verified_name,
        quality_rating: data.quality_rating,
      }
    });
  } catch (error) {
    console.error('WhatsApp config test error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}