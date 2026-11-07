import { createClient } from '@/lib/supabase/client';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function getCurrentBusiness() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = createClient();

  const { data: membership, error } = await supabase
    .from('business_members')
    .select(`
      business_id,
      businesses (
        id,
        name,
        logo_url,
        mobile_number,
        whatsapp_number,
        email,
        address,
        city,
        state,
        pin_code,
        gstin,
        business_type,
        currency,
        default_language
      )
    `)
    .eq('user_id', user.id)
    .single();

  if (error || !membership) {
    return null;
  }

  return membership.businesses;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function requireBusiness() {
  const user = await requireAuth();
  const business = await getCurrentBusiness();

  if (!business) {
    redirect('/onboarding');
  }

  return { user, business };
}

export async function signUp(email: string, password: string, fullName: string, businessName: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
