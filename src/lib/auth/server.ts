import { createServerClient } from '@/lib/supabase/client';
import { NextRequest } from 'next/server';

export interface AuthContext {
  supabase: ReturnType<typeof createServerClient>;
  user: any | null;
  businessId: string;
}

// Cache for business ID resolution (in-memory, per-request)
const getFallbackBusinessId = async (supabase: ReturnType<typeof createServerClient>) => {
  // Try to get the first business from the database
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);

  if (businesses?.length) {
    return businesses[0].id;
  }

  // Ultimate fallback ID (should never be reached in production)
  return '1ef097db-b7f9-4073-8959-e4e5deddaa70';
};

export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const supabase = createServerClient();
  const fallbackBusinessId = await getFallbackBusinessId(supabase);

  // Try to get token from Authorization header first
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data?.user) {
          const user = data.user;
          // Resolve business ID from membership
          const { data: membership } = await supabase
            .from('business_members')
            .select('business_id')
            .eq('user_id', user.id)
            .maybeSingle();

          const businessId = membership?.business_id || fallbackBusinessId;

          return {
            supabase,
            user,
            businessId,
          };
        }
      } catch (e) {
        console.error('Auth header error:', e);
      }
    }
  }

  // Fallback to default business for unauthenticated requests
  return {
    supabase,
    user: null,
    businessId: fallbackBusinessId,
  };
}
