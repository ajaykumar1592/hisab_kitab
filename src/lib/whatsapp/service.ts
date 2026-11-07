import { createServerClient } from '@/lib/supabase/client';

interface WhatsAppConfig {
  access_token: string;
  phone_number_id: string;
  business_account_id: string;
  default_template_namespace: string;
  is_active: boolean;
}

interface SendTemplateOptions {
  phone_number: string;
  template_name: string;
  language?: string;
  parameters: string[];
  customer_id?: string;
  reference_id?: string;
  reference_type?: 'receipt' | 'statement' | 'reminder' | 'custom';
}

export class WhatsAppService {
  private config: WhatsAppConfig | null = null;
  private businessId: string;

  constructor(businessId: string) {
    this.businessId = businessId;
  }

  async initialize(): Promise<boolean> {
    const supabase = createServerClient();

    const { data: config } = await supabase
      .from('whatsapp_configurations')
      .select('*')
      .eq('business_id', this.businessId)
      .eq('is_active', true)
      .single();

    if (!config) {
      return false;
    }

    this.config = {
      access_token: config.access_token,
      phone_number_id: config.phone_number_id,
      business_account_id: config.business_account_id,
      default_template_namespace: config.default_template_namespace || '',
      is_active: config.is_active,
    };

    return true;
  }

  async sendTemplate(options: SendTemplateOptions): Promise<{
    success: boolean;
    message_id?: string;
    error?: string;
  }> {
    if (!this.config || !this.config.is_active) {
      return { success: false, error: 'WhatsApp not configured or inactive' };
    }

    const supabase = createServerClient();

    // Get template
    const { data: template } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('business_id', this.businessId)
      .eq('name', options.template_name)
      .eq('status', 'approved')
      .single();

    if (!template) {
      return { success: false, error: 'Template not found or not approved' };
    }

    // Clean and format phone number
    const cleanPhone = options.phone_number.replace(/[\s\-\+]/g, '');
    const formattedPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    // Build components with parameter substitution
    const components = template.components.map((comp: any) => {
      if (comp.type === 'BODY' && comp.text) {
        let text = comp.text;
        options.parameters.forEach((param, index) => {
          text = text.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), param);
        });
        return { ...comp, text };
      }
      if (comp.type === 'HEADER' && comp.text) {
        let text = comp.text;
        options.parameters.forEach((param, index) => {
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
              options.parameters.forEach((param, index) => {
                url = url.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), param);
              });
              newBtn.url = url;
            }
            if (btn.payload) {
              let payload = btn.payload;
              options.parameters.forEach((param, index) => {
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

    try {
      // Send via Meta Graph API
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.config.phone_number_id}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'template',
            template: {
              namespace: this.config.default_template_namespace || template.meta_namespace,
              name: template.name,
              language: {
                code: options.language || template.language,
                policy: 'deterministic',
              },
              components,
            },
          }),
        }
      );

      const metaData = await response.json();

      if (!response.ok) {
        const errorMsg = metaData.error?.message || 'Failed to send message';

        // Log failed message
        await supabase
          .from('whatsapp_messages')
          .insert({
            business_id: this.businessId,
            customer_id: options.customer_id || null,
            template_id: template.id,
            phone_number: formattedPhone,
            message_id: null,
            status: 'failed',
            error_message: errorMsg,
            reference_id: options.reference_id || null,
            reference_type: options.reference_type || 'custom',
            sent_at: new Date().toISOString(),
          });

        return { success: false, error: errorMsg };
      }

      const messageId = metaData.messages?.[0]?.id;

      // Log successful message
      await supabase
        .from('whatsapp_messages')
        .insert({
          business_id: this.businessId,
          customer_id: options.customer_id || null,
          template_id: template.id,
          phone_number: formattedPhone,
          message_id: messageId,
          status: 'sent',
          reference_id: options.reference_id || null,
          reference_type: options.reference_type || 'custom',
          sent_at: new Date().toISOString(),
        });

      return { success: true, message_id: messageId };
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  // Convenience methods for common use cases

  async sendPaymentReceipt(
    customerPhone: string,
    customerName: string,
    amount: number,
    receiptNumber: string,
    receiptDate: string,
    paymentMethod: string,
    businessName: string,
    customerId?: string
  ): Promise<{ success: boolean; message_id?: string; error?: string }> {
    return this.sendTemplate({
      phone_number: customerPhone,
      template_name: 'payment_receipt',
      parameters: [
        customerName,
        `₹${amount.toLocaleString('en-IN')}`,
        receiptDate,
        receiptNumber,
        paymentMethod,
        businessName,
      ],
      customer_id: customerId,
      reference_id: receiptNumber,
      reference_type: 'receipt',
    });
  }

  async sendOutstandingReminder(
    customerPhone: string,
    customerName: string,
    outstandingAmount: number,
    businessName: string,
    customerId?: string
  ): Promise<{ success: boolean; message_id?: string; error?: string }> {
    return this.sendTemplate({
      phone_number: customerPhone,
      template_name: 'outstanding_reminder',
      parameters: [
        customerName,
        `₹${outstandingAmount.toLocaleString('en-IN')}`,
        businessName,
      ],
      customer_id: customerId,
      reference_type: 'reminder',
    });
  }

  async sendStatement(
    customerPhone: string,
    customerName: string,
    statementPeriod: string,
    openingBalance: number,
    closingBalance: number,
    businessName: string,
    customerId?: string
  ): Promise<{ success: boolean; message_id?: string; error?: string }> {
    return this.sendTemplate({
      phone_number: customerPhone,
      template_name: 'statement_ready',
      parameters: [
        customerName,
        statementPeriod,
        `₹${openingBalance.toLocaleString('en-IN')}`,
        `₹${closingBalance.toLocaleString('en-IN')}`,
        businessName,
      ],
      customer_id: customerId,
      reference_type: 'statement',
    });
  }

  async sendWelcomeMessage(
    customerPhone: string,
    customerName: string,
    businessName: string,
    loginUrl: string,
    customerId?: string
  ): Promise<{ success: boolean; message_id?: string; error?: string }> {
    return this.sendTemplate({
      phone_number: customerPhone,
      template_name: 'welcome_message',
      parameters: [
        businessName,
        customerName,
        loginUrl,
      ],
      customer_id: customerId,
      reference_type: 'custom',
    });
  }

  // Bulk send for multiple customers
  async sendBulkReminders(
    customers: Array<{
      id: string;
      phone: string;
      name: string;
      outstanding: number;
    }>,
    businessName: string
  ): Promise<Array<{ customer_id: string; success: boolean; message_id?: string; error?: string }>> {
    const results = [];

    for (const customer of customers) {
      if (customer.outstanding > 0) {
        const result = await this.sendOutstandingReminder(
          customer.phone,
          customer.name,
          customer.outstanding,
          businessName,
          customer.id
        );
        results.push({ customer_id: customer.id, ...result });

        // Rate limiting: small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        results.push({ customer_id: customer.id, success: false, error: 'No outstanding balance' });
      }
    }

    return results;
  }
}

// Client-side helper (for use in React components)
export async function sendWhatsAppMessage(
  businessId: string,
  options: SendTemplateOptions
) {
  const response = await fetch('/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  return response.json();
}