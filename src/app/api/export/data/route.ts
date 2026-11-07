import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

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
    const exportType = body.type || 'all';

    const businessId = membership.business_id;

    // Get business info
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    const zip = new JSZip();
    const businessName = business?.name ? business.name.replace(/[^a-z0-9]/gi, '_') : 'business';

    // Export customers
    if (exportType === 'customers' || exportType === 'all') {
      const { data: customers } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .is('deleted_at', null);

      const csv = generateCustomersCSV(customers || []);
      zip.file(`${businessName}_customers.csv`, csv);
    }

    // Export transactions
    if (exportType === 'transactions' || exportType === 'all') {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false });

      const csv = generateTransactionsCSV(transactions || []);
      zip.file(`${businessName}_transactions.csv`, csv);
    }

    // Export receipts
    if (exportType === 'receipts' || exportType === 'all') {
      const { data: receipts } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('business_id', businessId)
        .order('payment_date', { ascending: false });

      const csv = generateReceiptsCSV(receipts || []);
      zip.file(`${businessName}_receipts.csv`, csv);
    }

    // Export products (rate list)
    if (exportType === 'products' || exportType === 'all') {
      const { data: products } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (
            name
          )
        `)
        .eq('business_id', businessId)
        .is('deleted_at', null)
        .order('item_name');

      const csv = generateProductsCSV(products || []);
      zip.file(`${businessName}_products.csv`, csv);
    }

    // Export settings as JSON
    if (exportType === 'settings' || exportType === 'all') {
      const { data: settings } = await supabase
        .from('business_settings')
        .select('*')
        .eq('business_id', businessId)
        .single();

      const config = {
        business: business,
        settings: settings || null,
        exported_at: new Date().toISOString(),
        version: '1.0',
      };

      zip.file(`config.json`, JSON.stringify(config, null, 2));
    }

    // Generate ZIP
    const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

    // Create response
    const filename = `${businessName}_backup_${new Date().toISOString().split('T')[0]}.zip`;
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new NextResponse(zipBuffer as BodyInit, { headers });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

function generateCustomersCSV(customers: any[]): string {
  const headers = [
    'ID', 'Name', 'Mobile Number', 'Alternate Mobile', 'WhatsApp Number',
    'Business Type', 'Address', 'City', 'State', 'PIN Code', 'Email', 'GSTIN',
    'Opening Balance', 'Opening Balance Type', 'Notes', 'Status', 'Created At', 'Updated At'
  ];

  const rows = customers.map(c => [
    c.id,
    c.name,
    c.mobile_number || '',
    c.alternate_mobile_number || '',
    c.whatsapp_number || '',
    c.business_type || '',
    c.address || '',
    c.city || '',
    c.state || '',
    c.pin_code || '',
    c.email || '',
    c.gstin || '',
    (c.opening_balance || 0).toString(),
    c.opening_balance_type || '',
    c.notes || '',
    c.status || '',
    c.created_at,
    c.updated_at,
  ]);

  return [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
}

function generateTransactionsCSV(transactions: any[]): string {
  const headers = [
    'ID', 'Transaction Date', 'Type', 'Amount', 'Description',
    'Reference Number', 'Payment Method', 'Customer ID', 'Created At', 'Updated At'
  ];

  const rows = transactions.map(t => [
    t.id,
    t.transaction_date,
    t.transaction_type,
    (t.amount || 0).toString(),
    t.description || '',
    t.reference_number || '',
    t.payment_method || '',
    t.customer_id,
    t.created_at,
    t.updated_at,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generateReceiptsCSV(receipts: any[]): string {
  const headers = [
    'ID', 'Receipt Number', 'Customer ID', 'Customer Name', 'Customer Mobile',
    'Amount', 'Date', 'Payment Method', 'Reference Number', 'Description',
    'Previous Outstanding', 'Remaining Outstanding', 'Status', 'Created At'
  ];

  const rows = receipts.map(r => [
    r.id,
    r.receipt_number,
    r.customer_id,
    r.customers?.name || '',
    r.customers?.mobile_number || '',
    (r.payment_amount || 0).toString(),
    r.payment_date,
    r.payment_method,
    r.reference_number || '',
    r.description || '',
    (r.previous_outstanding || 0).toString(),
    (r.remaining_outstanding || 0).toString(),
    r.status,
    r.created_at,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generateProductsCSV(products: any[]): string {
  const headers = [
    'ID', 'Item Code', 'Item Name', 'Description', 'Category ID', 'Category', 'Unit',
    'Quantity', 'Rate', 'GST Percentage', 'Final Rate', 'Min Order Qty',
    'Effective Date', 'Expiry Date', 'Status', 'Created At', 'Updated At'
  ];

  const rows = products.map(p => [
    p.id,
    p.item_code || '',
    p.item_name,
    p.description || '',
    p.category_id || '',
    p.product_categories?.name || '',
    p.unit || '',
    (p.quantity || 0).toString(),
    (p.rate || 0).toString(),
    (p.gst_percentage || 0).toString(),
    (p.final_rate || 0).toString(),
    (p.minimum_order_quantity || 0).toString(),
    p.effective_date || '',
    p.expiry_date || '',
    p.status || '',
    p.created_at,
    p.updated_at,
  ]);

  return [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
}