import { createServerClient } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createServerClient();
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: { message: 'Failed to logout' } },
      { status: 500 }
    );
  }
}