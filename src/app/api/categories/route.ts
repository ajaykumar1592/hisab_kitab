import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';
import { productCategorySchema, productCategoryUpdateSchema } from '@/lib/validation/schemas';

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

    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('business_id', membership.business_id)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('Categories fetch error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch categories' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error('Categories GET error:', error);
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
    const validation = productCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    // Check for duplicate category name within business
    const { data: existing } = await supabase
      .from('product_categories')
      .select('id')
      .eq('business_id', membership.business_id)
      .eq('name', body.name)
      .is('deleted_at', null)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: { message: 'Category with this name already exists' } },
        { status: 409 }
      );
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
    }

    // Create category
    const { data: category, error } = await supabase
      .from('product_categories')
      .insert({
        ...validation.data,
        business_id: membership.business_id,
        description: body.description || null,
        parent_category_id: body.parent_category_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Category creation error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to create category' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Categories POST error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}