import { NextRequest, NextResponse } from 'next/server';
import { productCategorySchema, productCategoryUpdateSchema } from '@/lib/validation/schemas';
import { getAuthContext } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);

    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Categories fetch error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch categories', details: error.message, hint: error.hint, code: error.code } },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error('Categories GET error:', error);
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

    const validation = productCategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    if (body.name) {
      const { data: existing } = await supabase
        .from('product_categories')
        .select('id')
        .eq('business_id', businessId)
        .eq('name', body.name)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: { message: 'Category with this name already exists' } },
          { status: 409 }
        );
      }
    }

    const { data: category, error } = await supabase
      .from('product_categories')
      .insert({
        ...validation.data,
        business_id: businessId,
        description: body.description || null,
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

export async function PUT(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);
    const url = new URL(request.url);
    const categoryId = url.pathname.split('/').pop();

    if (!categoryId) {
      return NextResponse.json(
        { error: { message: 'Category ID is required' } },
        { status: 400 }
      );
    }

    const body = await request.json();

    const validation = productCategoryUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const { data: category, error } = await supabase
      .from('product_categories')
      .update(validation.data)
      .eq('id', categoryId)
      .eq('business_id', businessId)
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
    console.error('Categories PUT error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);
    const url = new URL(request.url);
    const categoryId = url.pathname.split('/').pop();

    if (!categoryId) {
      return NextResponse.json(
        { error: { message: 'Category ID is required' } },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', categoryId)
      .eq('business_id', businessId);

    if (error) {
      console.error('Category delete error:', error);
      return NextResponse.json(
        { error: { message: 'Failed to delete category' } },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Categories DELETE error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}