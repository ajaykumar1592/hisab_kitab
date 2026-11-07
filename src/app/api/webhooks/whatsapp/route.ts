import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Get webhook verify token from database
    const supabase = createServerClient();

    // We need to find the business by webhook verify token
    // Since this is a public webhook, we'll check all active configurations
    const { data: configs } = await supabase
      .from('whatsapp_configurations')
      .select('webhook_verify_token, business_id')
      .eq('is_active', true);

    const validConfig = configs?.find(c => c.webhook_verify_token === token);

    if (mode === 'subscribe' && token && challenge && validConfig) {
      console.log('Webhook verified for business:', validConfig.business_id);
      return new NextResponse(challenge, { status: 200 });
    }

    return NextResponse.json(
      { error: { message: 'Verification failed' } },
      { status: 403 }
    );
  } catch (error) {
    console.error('Webhook verification error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify this is a WhatsApp webhook
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json(
        { error: { message: 'Invalid webhook' } },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Process each entry
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          await processMessageStatus(change.value, supabase);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

async function processMessageStatus(value: any, supabase: any) {
  const { contacts, messages, statuses, errors } = value;

  // Handle message status updates (sent, delivered, read, failed)
  if (statuses) {
    for (const status of statuses) {
      const { id, status: messageStatus, timestamp, recipient_id, errors: statusErrors } = status;

      // Update message log
      const { data: existingMessage } = await supabase
        .from('whatsapp_messages')
        .select('id, customer_id, status')
        .eq('message_id', id)
        .single();

      if (existingMessage) {
        // Don't downgrade status (read > delivered > sent > failed)
        const statusPriority: Record<string, number> = {
          failed: 0,
          sent: 1,
          delivered: 2,
          read: 3,
        };

        const currentPriority = statusPriority[existingMessage.status] || 0;
        const newPriority = statusPriority[messageStatus] || 0;

        if (newPriority >= currentPriority) {
          await supabase
            .from('whatsapp_messages')
            .update({
              status: messageStatus,
              delivered_at: messageStatus === 'delivered' ? new Date(parseInt(timestamp) * 1000).toISOString() : undefined,
              read_at: messageStatus === 'read' ? new Date(parseInt(timestamp) * 1000).toISOString() : undefined,
              error_message: statusErrors?.[0]?.title || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMessage.id);
        }
      }
    }
  }

  // Handle incoming messages (if needed for two-way communication)
  if (messages) {
    for (const message of messages) {
      // Log incoming message if needed
      console.log('Incoming message:', message);
    }
  }

  // Handle errors
  if (errors) {
    for (const error of errors) {
      console.error('WhatsApp webhook error:', error);
    }
  }
}