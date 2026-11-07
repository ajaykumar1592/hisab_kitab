import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

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
    const format = searchParams.get('format') || 'csv';
    const categoryId = searchParams.get('category_id');
    const status = searchParams.get('status');

    let dbQuery = supabase
      .from('products')
      .select(`
        *,
        product_categories (
          id,
          name
        )
      `)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .order('item_name', { ascending: true });

    if (categoryId) {
      dbQuery = dbQuery.eq('category_id', categoryId);
    }

    if (status) {
      dbQuery = dbQuery.eq('status', status);
    }

    const { data: products, error } = await dbQuery;

    if (error) {
      console.error('Products export error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch products for export' } },
        { status: 500 }
      );
    }

    const exportData = (products || []).map(p => ({
      item_name: p.item_name,
      item_code: p.item_code || '',
      category: p.product_categories?.name || 'Uncategorized',
      unit: p.unit,
      quantity: p.quantity,
      rate: p.rate,
      gst_percentage: p.gst_percentage,
      final_rate: p.final_rate,
      hsn_code: p.hsn_code || '',
      description: p.description || '',
      status: p.status,
      created_at: p.created_at,
    }));

    if (format === 'json') {
      return NextResponse.json(
        exportData,
        {
          headers: {
            'Content-Disposition': `attachment; filename="rate-list-${new Date().toISOString().split('T')[0]}.json"`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // CSV format
    const headers = [
      'item_name', 'item_code', 'category', 'unit', 'quantity',
      'rate', 'gst_percentage', 'final_rate', 'hsn_code', 'description', 'status', 'created_at'
    ];

    const csvRows = [
      headers.join(','),
      ...exportData.map(item => [
        `"${item.item_name.replace(/"/g, '""')}"`,
        `"${item.item_code.replace(/"/g, '""')}"`,
        `"${item.category.replace(/"/g, '""')}"`,
        `"${item.unit.replace(/"/g, '""')}"`,
        item.quantity,
        item.rate,
        item.gst_percentage,
        item.final_rate,
        `"${item.hsn_code.replace(/"/g, '""')}"`,
        `"${item.description.replace(/"/g, '""')}"`,
        item.status,
        item.created_at,
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Disposition': `attachment; filename="rate-list-${new Date().toISOString().split('T')[0]}.csv"`,
        'Content-Type': 'text/csv; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Products export error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}