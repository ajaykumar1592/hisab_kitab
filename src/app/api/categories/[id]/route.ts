import { NextRequest, NextResponse } from 'next/server';
import { productCategoryUpdateSchema } from '@/lib/validation/schemas';
import { getAuthContext } from '@/lib/auth/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, businessId } = await getAuthContext(request);
    const { id } = await params;

    const { data: category, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .maybeSingle();

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
    const { supabase, businessId } = await getAuthContext(request);
    const { id } = await params;
    const body = await request.json();

    const validation = productCategoryUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    // Check if category exists
    const { data: existing } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('id', id)
      .eq('business_id', businessId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Category not found' } },
        { status: 404 }
      );
    }

    // Check for duplicate name if changed
    if (body.name && body.name !== existing.name) {
      const { data: duplicate } = await supabase
        .from('product_categories')
        .select('id')
        .eq('business_id', businessId)
        .eq('name', body.name)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json(
          { error: { message: 'Category with this name already exists' } },
          { status: 409 }
        );
      }
    }

    const { data: category, error } = await supabase
      .from('product_categories')
      .update({
        ...validation.data,
        description: body.description !== undefined ? body.description : undefined,
      })
      .eq('id', id)
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
    const { supabase, businessId } = await getAuthContext(request);
    const { id } = await params;

    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

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
