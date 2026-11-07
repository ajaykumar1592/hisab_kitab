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

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
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

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail registration if profile creation fails
    }

    // Create business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        owner_id: authData.user.id,
        name: business_name,
      })
      .select()
      .single();

    if (businessError) {
      console.error('Business creation error:', businessError);
      return NextResponse.json(
        { error: { message: 'Failed to create business' } },
        { status: 500 }
      );
    }

    // Create business membership
    const { error: memberError } = await supabase
      .from('business_members')
      .insert({
        business_id: business.id,
        user_id: authData.user.id,
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
      session: authData.session,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}