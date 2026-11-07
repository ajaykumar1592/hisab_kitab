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

    if (queryData.category_id) {
      dbQuery = dbQuery.eq('category_id', queryData.category_id);
    }

    if (queryData.status) {
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
        { error: { message: 'Failed to fetch products' } },
        { status: 500 }
      );
    }

    const transformedProducts = (products || []).map(p => ({
      ...p,
      category: p.product_categories?.name || 'Uncategorized',
    }));

    return NextResponse.json({
      products: transformedProducts,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
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

    if (body.category_id) {
      const { data: category } = await supabase
        .from('product_categories')
        .select('id')
        .eq('id', body.category_id)
        .eq('business_id', businessId)
        .single();

      if (!category) {
        return NextResponse.json(
          { error: { message: 'Category not found in this business' } },
          { status: 404 }
        );
      }
    }

    const finalRate = body.rate + (body.rate * body.gst_percentage / 100);

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        ...validation.data,
        business_id: businessId,
        final_rate: finalRate,
      })
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
        { error: { message: 'Failed to create product', details: error.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      product: {
        ...product,
        category: product.product_categories?.name || 'Uncategorized',
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