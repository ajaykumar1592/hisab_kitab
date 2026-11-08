import { NextRequest, NextResponse } from 'next/server';
import { productCreateSchema, productQuerySchema } from '@/lib/validation/schemas';
import { getAuthContext } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);

    const { searchParams } = new URL(request.url);
    const queryData = productQuerySchema.parse(Object.fromEntries(searchParams));

    let dbQuery = supabase
      .from('products')
      .select(`
        *,
        product_categories (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('business_id', businessId);

    if (queryData.search) {
      dbQuery = dbQuery.or(`item_name.ilike.%${queryData.search}%,item_code.ilike.%${queryData.search}%,description.ilike.%${queryData.search}%`);
    }

    if (queryData.category_id && queryData.category_id.trim() !== '' && queryData.category_id !== 'all') {
      dbQuery = dbQuery.eq('category_id', queryData.category_id);
    }

    if (queryData.status && queryData.status.trim() !== '' && queryData.status !== 'all') {
      dbQuery = dbQuery.eq('status', queryData.status);
    }

    const sortField = queryData.sort_by || 'item_name';
    const sortOrder = queryData.sort_order || 'asc';
    dbQuery = dbQuery.order(sortField, { ascending: sortOrder === 'asc' });

    const limit = queryData.limit || 50;
    const offset = queryData.offset || 0;
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data: products, error, count } = await dbQuery;

    if (error) {
      console.error('Products fetch error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch products', details: error.message, hint: error.hint, code: error.code } },
        { status: 500 }
      );
    }

    const transformedProducts = (products || []).map(p => {
      let hsn_code = (p as any).hsn_code || '';
      if (!hsn_code && p.description) {
        const match = p.description.match(/HSN:\s*([A-Za-z0-9]+)/i);
        if (match) hsn_code = match[1];
      }
      return {
        ...p,
        category: p.product_categories?.name || 'Uncategorized',
        hsn_code,
      };
    });

    return NextResponse.json({
      products: transformedProducts,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error', details: error instanceof Error ? error.message : String(error) } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, businessId } = await getAuthContext(request);

    const body = await request.json();
    console.log('Product POST body:', body);
    console.log('businessId:', businessId);
    console.log('user:', user?.id);

    const validation = productCreateSchema.safeParse(body);
    if (!validation.success) {
      console.log('Validation failed:', validation.error.flatten());
      return NextResponse.json(
        { error: { message: 'Validation failed', details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    if (body.item_code) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('business_id', businessId)
        .eq('item_code', body.item_code)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: { message: 'Item code already exists in this business' } },
          { status: 409 }
        );
      }
    }

    let validCategoryId = body.category_id || null;
    if (validCategoryId) {
      const { data: category } = await supabase
        .from('product_categories')
        .select('id')
        .eq('id', validCategoryId)
        .eq('business_id', businessId)
        .single();

      if (!category) {
        // Fall back to first category of business if provided one wasn't found
        const { data: firstCategory } = await supabase
          .from('product_categories')
          .select('id')
          .eq('business_id', businessId)
          .limit(1)
          .single();

        validCategoryId = firstCategory?.id || null;
      }
    }

    const rateNum = Number(validation.data.rate) || 0;
    const gstNum = Number(validation.data.gst_percentage) || 0;
    const finalRate = rateNum + (rateNum * gstNum / 100);

    // Format description with HSN code if provided
    let description = validation.data.description || '';
    if (validation.data.hsn_code) {
      const cleanDesc = description ? description.replace(/\|\s*HSN:\s*[\w\d]+/i, '').trim() : '';
      description = cleanDesc ? `${cleanDesc} | HSN: ${validation.data.hsn_code}` : `HSN: ${validation.data.hsn_code}`;
    }

    const productPayload: Record<string, unknown> = {
      business_id: businessId,
      category_id: validCategoryId,
      item_name: validation.data.item_name,
      item_code: validation.data.item_code || null,
      description: description || null,
      unit: validation.data.unit,
      quantity: validation.data.quantity ?? 1,
      rate: rateNum,
      gst_percentage: gstNum,
      final_rate: finalRate,
      status: validation.data.status || 'active',
    };

    if (validation.data.minimum_order_quantity !== undefined && validation.data.minimum_order_quantity !== null) {
      productPayload.minimum_order_quantity = validation.data.minimum_order_quantity;
    }
    if (validation.data.effective_date) {
      productPayload.effective_date = validation.data.effective_date;
    }
    if (validation.data.expiry_date) {
      productPayload.expiry_date = validation.data.expiry_date;
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert(productPayload)
      .select(`
        *,
        product_categories (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Product creation error:', error);
      return NextResponse.json(
        { error: { message: error.message || 'Failed to create product', details: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      product: {
        ...product,
        category: product.product_categories?.name || 'Uncategorized',
        hsn_code: validation.data.hsn_code || '',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Products POST error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}