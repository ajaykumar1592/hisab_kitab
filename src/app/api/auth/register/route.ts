import { createServerClient } from '@/lib/supabase/client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, business_name } = await request.json();

    if (!email || !password || !full_name || !business_name) {
      return NextResponse.json(
        { error: { message: 'All fields are required' } },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: { message: 'Password must be at least 6 characters' } },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Create auth user using Supabase Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: { message: authError.message } },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: { message: 'Failed to create user' } },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json(
        { error: { message: `Profile creation failed: ${profileError.message}` } },
        { status: 500 }
      );
    }

    // Create business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        owner_id: userId,
        name: business_name,
      })
      .select()
      .single();

    if (businessError) {
      console.error('Business creation error:', businessError);
      return NextResponse.json(
        { error: { message: `Failed to create business: ${businessError.message}` } },
        { status: 500 }
      );
    }

    // Create business membership
    const { error: memberError } = await supabase
      .from('business_members')
      .insert({
        business_id: business.id,
        user_id: userId,
        role: 'owner',
      });

    if (memberError) {
      console.error('Membership creation error:', memberError);
    }

    // Initialize business settings
    const { error: settingsError } = await supabase
      .from('business_settings')
      .insert({
        business_id: business.id,
      });

    if (settingsError) {
      console.error('Settings creation error:', settingsError);
    }

    return NextResponse.json({
      user: authData.user,
      business,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
