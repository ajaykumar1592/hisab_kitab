import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { productCreateSchema, productQuerySchema } from '@/lib/validation/schemas';

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
    const query = productQuerySchema.parse(Object.fromEntries(searchParams));

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
      .is('deleted_at', null);

    // Apply filters
    if (query.search) {
      dbQuery = dbQuery.or(`item_name.ilike.%${query.search}%,item_code.ilike.%${query.search}%,description.ilike.%${query.search}%`);
    }

    if (query.category_id) {
      dbQuery = dbQuery.eq('category_id', query.category_id);
    }

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }

    // Apply sorting
    const sortField = query.sort_by || 'item_name';
    const sortOrder = query.sort_order || 'asc';
    dbQuery = dbQuery.order(sortField, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data: products, error, count } = await dbQuery;

    if (error) {
      console.error('Products fetch error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch products' } },
        { status: 500 }
      );
    }

    // Transform data to include category name
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

    // Validate input
    const validation = productCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    // Check for duplicate item_code within business
    if (body.item_code) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('business_id', membership.business_id)
        .eq('item_code', body.item_code)
        .is('deleted_at', null)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: { message: 'Item code already exists in this business' } },
          { status: 409 }
        );
      }
    }

    // Verify category belongs to business
    if (body.category_id) {
      const { data: category } = await supabase
        .from('product_categories')
        .select('id')
        .eq('id', body.category_id)
        .eq('business_id', membership.business_id)
        .single();

      if (!category) {
        return NextResponse.json(
          { error: { message: 'Category not found in this business' } },
          { status: 404 }
        );
      }
    }

    // Calculate final rate
    const finalRate = body.rate + (body.rate * body.gst_percentage / 100);

    // Create product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        ...validation.data,
        business_id: membership.business_id,
        final_rate: finalRate,
        reference_number: body.reference_number || null,
        description: body.description || null,
        hsn_code: body.hsn_code || null,
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
        { error: { message: 'Failed to create product' } },
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