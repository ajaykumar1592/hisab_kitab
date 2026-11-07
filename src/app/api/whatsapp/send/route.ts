import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

interface SendMessageRequest {
  phone_number: string;
  template_name: string;
  language?: string;
  parameters: string[];
  customer_id?: string;
  reference_id?: string;
  reference_type?: 'receipt' | 'statement' | 'reminder' | 'custom';
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

    const body: SendMessageRequest = await request.json();

    // Validate required fields
    if (!body.phone_number || !body.template_name) {
      return NextResponse.json(
        { error: { message: 'Phone number and template name are required' } },
        { status: 400 }
      );
    }

    // Get WhatsApp config
    const { data: config } = await supabase
      .from('whatsapp_configurations')
      .select('access_token, phone_number_id, business_account_id, default_template_namespace, is_active')
      .eq('business_id', membership.business_id)
      .single();

    if (!config || !(config as any).is_active || !config.access_token || !config.phone_number_id) {
      return NextResponse.json(
        { error: { message: 'WhatsApp not configured or inactive' } },
        { status: 400 }
      );
    }

    // Get template
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('business_id', membership.business_id)
      .eq('name', body.template_name)
      .eq('status', 'approved')
      .single();

    if (!template) {
      return NextResponse.json(
        { error: { message: 'Template not found or not approved' } },
        { status: 404 }
      );
    }

    // Clean phone number (remove +, spaces, dashes)
    const cleanPhone = body.phone_number.replace(/[\s\-\+]/g, '');

    // Ensure Indian numbers have country code
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    // Build components with parameters
    const components = template.components.map((comp: any) => {
      if (comp.type === 'BODY' && comp.text) {
        let text = comp.text;
        body.parameters.forEach((param, index) => {
          text = text.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), param);
        });
        return { ...comp, text };
      }
      if (comp.type === 'HEADER' && comp.text) {
        let text = comp.text;
        body.parameters.forEach((param, index) => {
          text = text.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), param);
        });
        return { ...comp, text };
      }
      if (comp.type === 'BUTTONS' && comp.buttons) {
        return {
          ...comp,
          buttons: comp.buttons.map((btn: any) => {
            let newBtn = { ...btn };
            if (btn.url) {
              let url = btn.url;
              body.parameters.forEach((param, index) => {
                url = url.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), param);
              });
              newBtn.url = url;
            }
            if (btn.payload) {
              let payload = btn.payload;
              body.parameters.forEach((param, index) => {
                payload = payload.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), param);
              });
              newBtn.payload = payload;
            }
            return newBtn;
          }),
        };
      }
      return comp;
    });

    // Send message via Meta Graph API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            namespace: config.default_template_namespace || template.meta_namespace,
            name: template.name,
            language: {
              code: body.language || template.language,
              policy: 'deterministic',
            },
            components,
          },
        }),
      }
    );

    const metaData = await response.json();

    if (!response.ok) {
      console.error('Meta send error:', metaData.error);

      // Log failed message
      await supabase
        .from('whatsapp_messages')
        .insert({
          business_id: membership.business_id,
          customer_id: body.customer_id || null,
          template_id: template.id,
          phone_number: formattedPhone,
          message_id: null,
          status: 'failed',
          error_message: metaData.error?.message || 'Unknown error',
          reference_id: body.reference_id || null,
          reference_type: body.reference_type || 'custom',
          sent_at: new Date().toISOString(),
        });

      return NextResponse.json(
        {
          error: {
            message: metaData.error?.message || 'Failed to send message',
            details: metaData.error,
          }
        },
        { status: 400 }
      );
    }

    const messageId = metaData.messages?.[0]?.id;

    // Log successful message
    const { data: messageLog } = await supabase
      .from('whatsapp_messages')
      .insert({
        business_id: membership.business_id,
        customer_id: body.customer_id || null,
        template_id: template.id,
        phone_number: formattedPhone,
        message_id: messageId,
        status: 'sent',
        reference_id: body.reference_id || null,
        reference_type: body.reference_type || 'custom',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      message_id: messageId,
      status: 'sent',
      log: messageLog,
    });
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}