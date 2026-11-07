import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

interface CustomerImport {
  name: string;
  mobile_number?: string;
  alternate_mobile_number?: string;
  whatsapp_number?: string;
  business_type?: string;
  address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  email?: string;
  gstin?: string;
  opening_balance?: number;
  opening_balance_type?: 'receivable' | 'payable';
  notes?: string;
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
    const { customers, skip_duplicates = false, update_existing = false } = body as {
      customers: CustomerImport[];
      skip_duplicates?: boolean;
      update_existing?: boolean;
    };

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json(
        { error: { message: 'No customers provided' } },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const customer of customers) {
      try {
        // Validate required fields
        if (!customer.name) {
          throw new Error('Customer name is required');
        }

        // Check for duplicate mobile number
        if (customer.mobile_number) {
          const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .eq('business_id', membership.business_id)
            .eq('mobile_number', customer.mobile_number)
            .single();

          if (existing) {
            if (skip_duplicates) {
              results.push({ id: existing.id, name: customer.name, status: 'skipped', reason: 'Duplicate mobile number' });
              continue;
            }

            if (update_existing) {
              const { data: updated, error: updateError } = await supabase
                .from('customers')
                .update({
                  ...customer,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .select()
                .single();

              if (updateError) throw updateError;
              results.push({ id: updated.id, name: customer.name, status: 'updated' });
              continue;
            }
          }
        }

        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            ...customer,
            business_id: membership.business_id,
            mobile_number: customer.mobile_number || null,
            alternate_mobile_number: customer.alternate_mobile_number || null,
            whatsapp_number: customer.whatsapp_number || null,
            opening_balance: customer.opening_balance || 0,
            opening_balance_type: customer.opening_balance_type || 'receivable',
          })
          .select()
          .single();

        if (createError) throw createError;

        results.push({ id: newCustomer.id, name: customer.name, status: 'created' });
      } catch (err: any) {
        errors.push({ name: customer.name, error: err.message });
      }
    }

    const summary = {
      total: customers.length,
      created: results.filter((r: any) => r.status === 'created').length,
      updated: results.filter((r: any) => r.status === 'updated').length,
      skipped: results.filter((r: any) => r.status === 'skipped').length,
      failed: errors.length,
    };

    // Log audit
    await supabase
      .from('audit_logs')
      .insert({
        business_id: membership.business_id,
        action: 'import',
        table_name: 'customers',
        record_id: null,
        old_values: null,
        new_values: { summary, results, errors },
      });

    return NextResponse.json({
      success: true,
      summary,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Customer import error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}