import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const mask = (key?: string) => {
    if (!key) return 'MISSING (Not set in Vercel)';
    if (key.length <= 10) return 'Too short (might be invalid)';
    return `${key.slice(0, 10)}...${key.slice(-6)} (length: ${key.length})`;
  };

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: {
      NEXT_PUBLIC_SUPABASE_URL: url ? `${url.slice(0, 30)}...` : 'MISSING (Not set in Vercel)',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(anonKey),
      SUPABASE_SERVICE_ROLE_KEY: mask(serviceKey),
    },
    database_check: {
      status: 'pending',
      error: null,
      businesses: 0,
      categories: 0,
      products: 0,
    },
  };

  if (!url || !serviceKey) {
    diagnostics.database_check.status = 'FAILED';
    diagnostics.database_check.error = 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in Vercel environment variables';
    return NextResponse.json(diagnostics, { status: 500 });
  }

  try {
    const supabase = createServerClient();

    // 1. Test basic business query
    const { data: businesses, error: bizError } = await supabase
      .from('businesses')
      .select('id, name')
      .limit(5);

    if (bizError) {
      diagnostics.database_check.status = 'FAILED';
      diagnostics.database_check.error = {
        message: bizError.message,
        details: bizError.details,
        hint: bizError.hint,
        code: bizError.code,
      };
      return NextResponse.json(diagnostics, { status: 500 });
    }

    // 2. Count categories and products
    const { count: catCount } = await supabase
      .from('product_categories')
      .select('*', { count: 'exact', head: true });

    const { count: prodCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    diagnostics.database_check.status = 'SUCCESS';
    diagnostics.database_check.businesses = businesses?.length || 0;
    diagnostics.database_check.categories = catCount || 0;
    diagnostics.database_check.products = prodCount || 0;
    diagnostics.database_check.business_list = businesses;

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (err) {
    diagnostics.database_check.status = 'EXCEPTION';
    diagnostics.database_check.error = err instanceof Error ? err.message : String(err);
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
