import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { productUpdateSchema } from '@/lib/validation/schemas';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { id } = await params;

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

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories (
          id,
          name
        )
      `)
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: { message: 'Product not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      product: {
        ...product,
        category: product.product_categories?.name || 'Uncategorized',
      },
    });
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = productUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', details: validation.error.flatten() } },
        { status: 400 }
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

    // Check if product exists and belongs to business
    const { data: existing } = await supabase
      .from('products')
      .select('id, item_code')
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Product not found' } },
        { status: 404 }
      );
    }

    // If item_code is being changed, check for duplicates
    if (body.item_code && body.item_code !== existing.item_code) {
      const { data: duplicate } = await supabase
        .from('products')
        .select('id')
        .eq('business_id', membership.business_id)
        .eq('item_code', body.item_code)
        .is('deleted_at', null)
        .single();

      if (duplicate) {
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

    // Calculate final rate if rate or gst_percentage changed
    const finalRate = body.rate !== undefined && body.gst_percentage !== undefined
      ? body.rate + (body.rate * body.gst_percentage / 100)
      : undefined;

    // Update product
    const updateData: Record<string, unknown> = {
      ...validation.data,
      reference_number: body.reference_number || null,
      description: body.description || null,
      hsn_code: body.hsn_code || null,
    };

    if (finalRate !== undefined) {
      updateData.final_rate = finalRate;
    }

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .select(`
        *,
        product_categories (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Product update error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to update product' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      product: {
        ...product,
        category: product.product_categories?.name || 'Uncategorized',
      },
    });
  } catch (error) {
    console.error('Product PUT error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { id } = await params;

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

    // Soft delete - set deleted_at
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', membership.business_id);

    if (error) {
      console.error('Product delete error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to delete product' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}