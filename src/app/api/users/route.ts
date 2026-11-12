import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getAuthContext } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);

    // Fetch all business members for the business
    const { data: members, error: memError } = await supabase
      .from('business_members')
      .select('id, user_id, role, created_at')
      .eq('business_id', businessId);

    if (memError) {
      console.error('Error fetching members:', memError);
      return NextResponse.json({ error: { message: memError.message } }, { status: 500 });
    }

    // Fetch profiles
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at');

    if (profError) {
      console.error('Error fetching profiles:', profError);
    }

    // Fetch auth users using admin client to get metadata and ban status
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Error listing auth users:', authError);
    }

    const authUsersMap = new Map((authData?.users || []).map(u => [u.id, u]));
    const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

    // Build user list for this business
    const users = (members || []).map(member => {
      const authUser = authUsersMap.get(member.user_id);
      const profile = profilesMap.get(member.user_id);

      const email = authUser?.email || profile?.email || '';
      const fullName = profile?.full_name || authUser?.user_metadata?.full_name || '';
      const status = authUser?.user_metadata?.status || (authUser?.banned_until ? 'inactive' : 'active');
      // Assigned or initial password stored in metadata so admin can reveal
      const assignedPassword = authUser?.user_metadata?.assigned_password || authUser?.user_metadata?.initial_password || authUser?.user_metadata?.last_password || '';

      return {
        id: member.user_id,
        member_id: member.id,
        email,
        full_name: fullName,
        role: member.role || authUser?.user_metadata?.role || 'member',
        status,
        assigned_password: assignedPassword,
        created_at: member.created_at || authUser?.created_at,
        last_sign_in_at: authUser?.last_sign_in_at || null,
      };
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: { message: error.message || 'Internal server error' } }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, businessId } = await getAuthContext(request);
    const body = await request.json();

    const { email, password, full_name, role = 'member', status = 'active' } = body;

    if (!email || !password) {
      return NextResponse.json({ error: { message: 'Email and password are required' } }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: { message: 'Password must be at least 6 characters' } }, { status: 400 });
    }

    // Create user in Supabase Auth via admin API
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
        assigned_password: password,
        initial_password: password,
        role,
        status,
      },
    });

    if (createError || !authUser?.user) {
      return NextResponse.json(
        { error: { message: createError?.message || 'Failed to create user' } },
        { status: 400 }
      );
    }

    const userId = authUser.user.id;

    // Set ban if inactive
    if (status === 'inactive') {
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: '876000h',
      });
    }

    // Create/update profile in profiles table
    await supabase.from('profiles').upsert({
      id: userId,
      email,
      full_name: full_name || '',
      updated_at: new Date().toISOString(),
    });

    // Add to business_members
    const { error: memError } = await supabase.from('business_members').insert({
      business_id: businessId,
      user_id: userId,
      role: role || 'member',
    });

    if (memError) {
      console.error('Error adding to business_members:', memError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        full_name: full_name || '',
        role,
        status,
        assigned_password: password,
      },
    });
  } catch (error: any) {
    console.error('Users POST error:', error);
    return NextResponse.json({ error: { message: error.message || 'Internal server error' } }, { status: 500 });
  }
}
