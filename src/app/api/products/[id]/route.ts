import { NextRequest, NextResponse } from 'next/server';
import { productUpdateSchema } from '@/lib/validation/schemas';
import { getAuthContext } from '@/lib/auth/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, businessId } = await getAuthContext(request);
    const { id } = await params;

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
      .eq('business_id', businessId)
      .single();

    if (error || !product) {
      return NextResponse.json(
        { error: { message: 'Product not found' } },
        { status: 404 }
      );
    }

    let hsn_code = (product as any).hsn_code || '';
    if (!hsn_code && product.description) {
      const match = product.description.match(/HSN:\s*([A-Za-z0-9]+)/i);
      if (match) hsn_code = match[1];
    }

    return NextResponse.json({
      product: {
        ...product,
        category: product.product_categories?.name || 'Uncategorized',
        hsn_code,
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
    const { supabase, businessId } = await getAuthContext(request);
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

    // Check if product exists and belongs to business
    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: { message: 'Product not found' } },
        { status: 404 }
      );
    }

    // If item_code is being changed, check for duplicates
    if (validation.data.item_code && validation.data.item_code !== existing.item_code) {
      const { data: duplicate } = await supabase
        .from('products')
        .select('id')
        .eq('business_id', businessId)
        .eq('item_code', validation.data.item_code)
        .neq('id', id)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: { message: 'Item code already exists in this business' } },
          { status: 409 }
        );
      }
    }

    // Verify category belongs to business
    let categoryId = validation.data.category_id !== undefined ? validation.data.category_id : existing.category_id;
    if (categoryId) {
      const { data: category } = await supabase
        .from('product_categories')
        .select('id')
        .eq('id', categoryId)
        .eq('business_id', businessId)
        .single();

      if (!category) {
        categoryId = existing.category_id;
      }
    }

    // Calculate final rate
    const newRate = validation.data.rate !== undefined ? Number(validation.data.rate) : existing.rate;
    const newGst = validation.data.gst_percentage !== undefined ? Number(validation.data.gst_percentage) : (existing.gst_percentage || 0);
    const finalRate = newRate + (newRate * newGst / 100);

    // Format description with HSN code if provided
    let description = validation.data.description !== undefined ? validation.data.description : existing.description;
    const hsnInput = validation.data.hsn_code !== undefined ? validation.data.hsn_code : null;

    if (hsnInput) {
      const cleanDesc = description ? description.replace(/\|\s*HSN:\s*[\w\d]+/i, '').replace(/^HSN:\s*[\w\d]+\s*/i, '').trim() : '';
      description = cleanDesc ? `${cleanDesc} | HSN: ${hsnInput}` : `HSN: ${hsnInput}`;
    }

    // Build updateData strictly with valid columns for products table
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      final_rate: finalRate,
    };

    if (validation.data.item_name !== undefined) updateData.item_name = validation.data.item_name;
    if (validation.data.item_code !== undefined) updateData.item_code = validation.data.item_code || null;
    if (categoryId !== undefined) updateData.category_id = categoryId;
    if (validation.data.unit !== undefined) updateData.unit = validation.data.unit;
    if (validation.data.quantity !== undefined) updateData.quantity = validation.data.quantity;
    if (validation.data.rate !== undefined) updateData.rate = newRate;
    if (validation.data.gst_percentage !== undefined) updateData.gst_percentage = newGst;
    if (description !== undefined) updateData.description = description || null;
    if (validation.data.status !== undefined) updateData.status = validation.data.status;
    if (validation.data.minimum_order_quantity !== undefined) updateData.minimum_order_quantity = validation.data.minimum_order_quantity;
    if (validation.data.effective_date !== undefined) updateData.effective_date = validation.data.effective_date || null;
    if (validation.data.expiry_date !== undefined) updateData.expiry_date = validation.data.expiry_date || null;

    const { data: updatedProduct, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
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
        { error: { message: error.message || 'Failed to update product' } },
        { status: 500 }
      );
    }

    let hsn_code = hsnInput || '';
    if (!hsn_code && updatedProduct.description) {
      const match = updatedProduct.description.match(/HSN:\s*([A-Za-z0-9]+)/i);
      if (match) hsn_code = match[1];
    }

    return NextResponse.json({
      product: {
        ...updatedProduct,
        category: updatedProduct.product_categories?.name || 'Uncategorized',
        hsn_code,
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
    const { supabase, businessId } = await getAuthContext(request);
    const { id } = await params;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) {
      console.error('Product delete error:', error);
      return NextResponse.json(
        { error: { message: error.message || 'Failed to delete product' } },
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
