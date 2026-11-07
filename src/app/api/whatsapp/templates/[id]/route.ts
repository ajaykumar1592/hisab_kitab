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

    const { id } = await params;

    const { data: template, error } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: { message: 'Template not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Template GET error:', error);
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

    const { id } = await params;
    const body = await request.json();

    // Get current template
    const { data: currentTemplate } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .single();

    if (!currentTemplate) {
      return NextResponse.json(
        { error: { message: 'Template not found' } },
        { status: 404 }
      );
    }

    // Get WhatsApp config for Meta sync
    const { data: config } = await supabase
      .from('whatsapp_configurations')
      .select('access_token, business_account_id')
      .eq('business_id', membership.business_id)
      .single();

    let metaSynced = false;

    // If config exists and template was synced to Meta, update there too
    if (config?.access_token && config?.business_account_id && currentTemplate.meta_template_id) {
      try {
        const metaResponse = await fetch(
          `https://graph.facebook.com/v18.0/${currentTemplate.meta_template_id}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: body.name || currentTemplate.name,
              language: body.language || currentTemplate.language,
              category: (body.category || currentTemplate.category).toUpperCase(),
              components: body.components || currentTemplate.components,
            }),
          }
        );

        if (metaResponse.ok) {
          metaSynced = true;
        }
      } catch (err) {
        console.warn('Meta template update failed:', err);
      }
    }

    // Update locally
    const { data: template, error } = await supabase
      .from('whatsapp_templates')
      .update({
        name: body.name,
        language: body.language,
        category: body.category,
        components: body.components,
        status: metaSynced ? 'approved' : (currentTemplate.status === 'approved' ? 'pending' : currentTemplate.status),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .select()
      .single();

    if (error) {
      console.error('Template update error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to update template' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Template PUT error:', error);
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

    const { id } = await params;

    // Get template for Meta deletion
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('meta_template_id')
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .single();

    // Delete from Meta if synced
    if (template?.meta_template_id) {
      const { data: config } = await supabase
        .from('whatsapp_configurations')
        .select('access_token, business_account_id')
        .eq('business_id', membership.business_id)
        .single();

      if (config?.access_token && config?.business_account_id) {
        try {
          await fetch(
            `https://graph.facebook.com/v18.0/${template.meta_template_id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${config.access_token}`,
              },
            }
          );
        } catch (err) {
          console.warn('Meta template deletion failed:', err);
        }
      }
    }

    // Soft delete locally
    const { error } = await supabase
      .from('whatsapp_templates')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', membership.business_id);

    if (error) {
      console.error('Template deletion error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to delete template' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Template DELETE error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}