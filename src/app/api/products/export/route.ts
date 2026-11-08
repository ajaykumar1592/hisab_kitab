import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);

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
      .eq('business_id', businessId)
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

    const exportData = (products || []).map(p => {
      let hsn = (p as any).hsn_code || '';
      if (!hsn && p.description) {
        const match = p.description.match(/HSN:\s*([A-Za-z0-9]+)/i);
        if (match) hsn = match[1];
      }
      return {
        item_name: p.item_name,
        item_code: p.item_code || '',
        category: p.product_categories?.name || 'Uncategorized',
        unit: p.unit,
        quantity: p.quantity,
        rate: p.rate,
        gst_percentage: p.gst_percentage,
        final_rate: p.final_rate,
        hsn_code: hsn,
        description: p.description || '',
        status: p.status,
        created_at: p.created_at,
      };
    });

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