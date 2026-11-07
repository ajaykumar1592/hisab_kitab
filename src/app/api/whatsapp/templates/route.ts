import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: TemplateButton[];
}

interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';
  text: string;
  url?: string;
  phone_number?: string;
  payload?: string;
}

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    let query = supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('business_id', membership.business_id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Templates fetch error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch templates' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error('Templates GET error:', error);
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

    // Validate required fields
    if (!body.name || !body.language || !body.category || !body.components) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    // Validate template name format (snake_case)
    if (!/^[a-z][a-z0-9_]*$/.test(body.name)) {
      return NextResponse.json(
        { error: { message: 'Template name must be lowercase with underscores only' } },
        { status: 400 }
      );
    }

    // Check if template name already exists
    const { data: existing } = await supabase
      .from('whatsapp_templates')
      .select('id')
      .eq('business_id', membership.business_id)
      .eq('name', body.name)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: { message: 'Template with this name already exists' } },
        { status: 409 }
      );
    }

    // Get WhatsApp config for API access
    const { data: config } = await supabase
      .from('whatsapp_configurations')
      .select('access_token, business_account_id, default_template_namespace')
      .eq('business_id', membership.business_id)
      .single();

    let metaTemplateId: string | null = null;

    // If config exists and is active, sync with Meta
    if (config?.access_token && config?.business_account_id) {
      try {
        const metaResponse = await fetch(
          `https://graph.facebook.com/v18.0/${config.business_account_id}/message_templates`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: body.name,
              language: body.language,
              category: body.category.toUpperCase(),
              components: body.components,
            }),
          }
        );

        const metaData = await metaResponse.json();

        if (metaResponse.ok) {
          metaTemplateId = metaData.id;
        } else {
          console.warn('Meta template creation failed:', metaData.error);
          // Don't fail - store locally and mark as pending sync
        }
      } catch (err) {
        console.warn('Meta API error:', err);
      }
    }

    // Create template locally
    const { data: template, error } = await supabase
      .from('whatsapp_templates')
      .insert({
        business_id: membership.business_id,
        name: body.name,
        language: body.language,
        category: body.category,
        status: metaTemplateId ? 'approved' : 'pending',
        components: body.components,
        meta_template_id: metaTemplateId,
        meta_namespace: config?.default_template_namespace || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Template creation error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to create template' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Templates POST error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}