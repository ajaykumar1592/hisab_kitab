import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { getAuthContext } from '@/lib/auth/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user } = await getAuthContext(request);

    if (user && user.id === id) {
      return NextResponse.json({ error: { message: 'You cannot deactivate your own account' } }, { status: 400 });
    }

    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(id);
    if (getUserError || !userData?.user) {
      return NextResponse.json({ error: { message: 'User not found' } }, { status: 404 });
    }

    const currentStatus = userData.user.user_metadata?.status || (userData.user.banned_until ? 'inactive' : 'active');
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    const { error: updateError } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: newStatus === 'inactive' ? '876000h' : 'none',
      user_metadata: {
        ...(userData.user.user_metadata || {}),
        status: newStatus,
      },
    });

    if (updateError) {
      return NextResponse.json({ error: { message: updateError.message } }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: `User is now ${newStatus}`,
    });
  } catch (error: any) {
    console.error('Toggle status error:', error);
    return NextResponse.json({ error: { message: error.message || 'Internal server error' } }, { status: 500 });
  }
}
