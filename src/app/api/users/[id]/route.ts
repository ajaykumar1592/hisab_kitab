import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getAuthContext } from '@/lib/auth/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, businessId } = await getAuthContext(request);
    const body = await request.json();

    const { full_name, role, status, password } = body;

    // Fetch existing user metadata
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(id);
    if (getUserError || !userData?.user) {
      return NextResponse.json({ error: { message: 'User not found' } }, { status: 404 });
    }

    const currentMetadata = userData.user.user_metadata || {};
    const updatedMetadata: Record<string, any> = {
      ...currentMetadata,
    };

    if (full_name !== undefined) updatedMetadata.full_name = full_name;
    if (role !== undefined) updatedMetadata.role = role;
    if (status !== undefined) updatedMetadata.status = status;

    const authUpdatePayload: Record<string, any> = {
      user_metadata: updatedMetadata,
    };

    // If new password is provided
    if (password && password.trim().length > 0) {
      if (password.length < 6) {
        return NextResponse.json({ error: { message: 'Password must be at least 6 characters' } }, { status: 400 });
      }
      authUpdatePayload.password = password;
      updatedMetadata.assigned_password = password;
      updatedMetadata.last_password = password;
    }

    // If status is changed, update ban
    if (status === 'inactive') {
      authUpdatePayload.ban_duration = '876000h';
    } else if (status === 'active') {
      authUpdatePayload.ban_duration = 'none';
    }

    // Update in Supabase Auth
    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(id, authUpdatePayload);
    if (updateAuthError) {
      return NextResponse.json({ error: { message: updateAuthError.message } }, { status: 400 });
    }

    // Update profiles table if name changed
    if (full_name !== undefined) {
      await supabase
        .from('profiles')
        .update({ full_name, updated_at: new Date().toISOString() })
        .eq('id', id);
    }

    // Update business_members role if role changed
    if (role !== undefined) {
      await supabase
        .from('business_members')
        .update({ role })
        .eq('business_id', businessId)
        .eq('user_id', id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id,
        full_name: updatedMetadata.full_name,
        role: updatedMetadata.role,
        status: updatedMetadata.status,
        assigned_password: updatedMetadata.assigned_password,
      },
    });
  } catch (error: any) {
    console.error('User PUT error:', error);
    return NextResponse.json({ error: { message: error.message || 'Internal server error' } }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user, businessId } = await getAuthContext(request);

    // Prevent deleting oneself
    if (user && user.id === id) {
      return NextResponse.json({ error: { message: 'You cannot delete your own account' } }, { status: 400 });
    }

    // Remove from business_members
    await supabase
      .from('business_members')
      .delete()
      .eq('business_id', businessId)
      .eq('user_id', id);

    // Remove from profiles
    await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    // Delete auth user via admin API
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id);
    if (deleteError) {
      console.warn('Could not delete auth user (may already be deleted):', deleteError.message);
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('User DELETE error:', error);
    return NextResponse.json({ error: { message: error.message || 'Internal server error' } }, { status: 500 });
  }
}
