import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { productCategoryUpdateSchema } from '@/lib/validation/schemas';

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

    const { data: category, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .single();

    if (error || !category) {
      return NextResponse.json(
        { error: { message: 'Category not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Category GET error:', error);
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
    const validation = productCategoryUpdateSchema.safeParse(body);
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

    // Check if category exists and belongs to business
    const { data: existing } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Category not found' } },
        { status: 404 }
      );
    }

    // If name is being changed, check for duplicates
    if (body.name && body.name !== existing.name) {
      const { data: duplicate } = await supabase
        .from('product_categories')
        .select('id')
        .eq('business_id', membership.business_id)
        .eq('name', body.name)
        .is('deleted_at', null)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: { message: 'Category with this name already exists' } },
          { status: 409 }
        );
      }
    }

    // If parent_category_id is provided, verify it exists and belongs to business
    if (body.parent_category_id) {
      const { data: parent } = await supabase
        .from('product_categories')
        .select('id')
        .eq('id', body.parent_category_id)
        .eq('business_id', membership.business_id)
        .is('deleted_at', null)
        .single();

      if (!parent) {
        return NextResponse.json(
          { error: { message: 'Parent category not found' } },
          { status: 404 }
        );
      }

      // Prevent circular reference
      if (body.parent_category_id === id) {
        return NextResponse.json(
          { error: { message: 'Category cannot be its own parent' } },
          { status: 400 }
        );
      }
    }

    // Update category
    const { data: category, error } = await supabase
      .from('product_categories')
      .update({
        ...validation.data,
        description: body.description || null,
        parent_category_id: body.parent_category_id || null,
      })
      .eq('id', id)
      .eq('business_id', membership.business_id)
      .select()
      .single();

    if (error) {
      console.error('Category update error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to update category' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Category PUT error:', error);
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

    // Check if category has products
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', id)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .limit(1);

    if (products && products.length > 0) {
      return NextResponse.json(
        { error: { message: 'Cannot delete category with existing products. Move or delete products first.' } },
        { status: 400 }
      );
    }

    // Check if category has subcategories
    const { data: subcategories } = await supabase
      .from('product_categories')
      .select('id')
      .eq('parent_category_id', id)
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .limit(1);

    if (subcategories && subcategories.length > 0) {
      return NextResponse.json(
        { error: { message: 'Cannot delete category with subcategories. Move or delete subcategories first.' } },
        { status: 400 }
      );
    }

    // Soft delete - set deleted_at
    const { error } = await supabase
      .from('product_categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('business_id', membership.business_id);

    if (error) {
      console.error('Category delete error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to delete category' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Category DELETE error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}