import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

interface ProductImport {
  item_name: string;
  item_code?: string;
  category?: string;
  unit?: string;
  quantity?: number;
  rate?: number;
  gst_percentage?: number;
  hsn_code?: string;
  description?: string;
  effective_date?: string;
  expiry_date?: string;
  status?: 'active' | 'inactive';
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
    const { products, skip_duplicates = false, update_existing = false } = body as {
      products: ProductImport[];
      skip_duplicates?: boolean;
      update_existing?: boolean;
    };

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: { message: 'No products provided' } },
        { status: 400 }
      );
    }

    const businessId = membership.business_id;
    const results: Array<{ id: string; item_name: string; status: string; reason?: string }> = [];
    const errors: Array<{ item_name: string; error: string }> = [];

    // Get all valid categories for the business
    const { data: categories } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('business_id', businessId);

    const categoryMap: Record<string, string> = {};
    if (categories) {
      categories.forEach((cat: { id: string; name: string }) => {
        categoryMap[cat.name] = cat.id;
      });
    }

    for (const product of products) {
      try {
        if (!product.item_name) {
          throw new Error('Item name is required');
        }

        // Check for duplicate item_code
        let existingProduct: { id: string } | null = null;

        if (product.item_code) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('business_id', businessId)
            .eq('item_code', product.item_code)
            .is('deleted_at', null)
            .single();
          existingProduct = existing;
        }

        if (!existingProduct && !skip_duplicates) {
          const { data: existingByName } = await supabase
            .from('products')
            .select('id')
            .eq('business_id', businessId)
            .eq('item_name', product.item_name)
            .is('deleted_at', null)
            .single();
          existingProduct = existingByName;
        }

        if (existingProduct) {
          if (skip_duplicates) {
            results.push({ id: existingProduct.id, item_name: product.item_name, status: 'skipped', reason: 'Duplicate item code/name' });
            continue;
          }

          if (update_existing) {
            // Get or create category ID
            let categoryId = null;
            if (product.category) {
              if (categoryMap[product.category]) {
                categoryId = categoryMap[product.category];
              } else {
                const { data: newCategory, error: categoryError } = await supabase
                  .from('product_categories')
                  .insert({
                    business_id: businessId,
                    name: product.category,
                    description: 'Auto-created from import',
                  })
                  .select('id')
                  .single();

                if (categoryError) throw new Error(`Failed to create category: ${categoryError.message}`);
                categoryId = newCategory.id;
              }
            }

            const finalRate = (product.rate || 0) + ((product.rate || 0) * (product.gst_percentage || 18) / 100);

            const { data: updated, error: updateError } = await supabase
              .from('products')
              .update({
                item_code: product.item_code || null,
                category_id: categoryId,
                unit: product.unit || 'Piece',
                quantity: product.quantity || 1,
                rate: product.rate || 0,
                gst_percentage: product.gst_percentage || 18,
                final_rate: finalRate,
                hsn_code: product.hsn_code || null,
                description: product.description || null,
                effective_date: product.effective_date || null,
                expiry_date: product.expiry_date || null,
                status: product.status || 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingProduct.id)
              .eq('business_id', businessId)
              .select()
              .single();

            if (updateError) throw updateError;
            results.push({ id: updated.id, item_name: product.item_name, status: 'updated' });
            continue;
          }
        }

        // Get or create category ID
        let categoryId = null;
        if (product.category) {
          if (categoryMap[product.category]) {
            categoryId = categoryMap[product.category];
          } else if (!categories || categories.length === 0) {
            // Create category if it doesn't exist
            const { data: newCategory, error: categoryError } = await supabase
              .from('product_categories')
              .insert({
                business_id: businessId,
                name: product.category,
                description: 'Auto-created from import',
              })
              .select('id')
              .single();

            if (categoryError) throw new Error(`Failed to create category: ${categoryError.message}`);
            categoryId = newCategory.id;
          }
        }

        const finalRate = (product.rate || 0) + ((product.rate || 0) * (product.gst_percentage || 18) / 100);

        // Create new product
        const { data: newProduct, error: createError } = await supabase
          .from('products')
          .insert({
            business_id: businessId,
            item_name: product.item_name,
            item_code: product.item_code || null,
            category_id: categoryId,
            unit: product.unit || 'Piece',
            quantity: product.quantity || 1,
            rate: product.rate || 0,
            gst_percentage: product.gst_percentage || 18,
            final_rate: finalRate,
            hsn_code: product.hsn_code || null,
            description: product.description || null,
            effective_date: product.effective_date || null,
            expiry_date: product.expiry_date || null,
            status: product.status || 'active',
          })
          .select()
          .single();

        if (createError) throw createError;

        results.push({ id: newProduct.id, item_name: product.item_name, status: 'created' });
      } catch (err: any) {
        errors.push({ item_name: product.item_name, error: err.message });
      }
    }

    const summary = {
      total: products.length,
      created: results.filter((r: any) => r.status === 'created').length,
      updated: results.filter((r: any) => r.status === 'updated').length,
      skipped: results.filter((r: any) => r.status === 'skipped').length,
      failed: errors.length,
    };

    // Log audit
    await supabase
      .from('audit_logs')
      .insert({
        business_id: businessId,
        action: 'import',
        table_name: 'products',
        record_id: null,
        old_values: null,
        new_values: { summary, results, errors },
      });

    return NextResponse.json({
      success: true,
      summary,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Product import error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}