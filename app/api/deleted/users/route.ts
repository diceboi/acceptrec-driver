import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted users:', error);
      return NextResponse.json([], { status: 200 });
    }

    // Transform to camelCase
    const transformedUsers = (users || []).map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      deletedAt: user.deleted_at,
      deletedBy: user.deleted_by,
    }));

    return NextResponse.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching deleted users:', error);
    return NextResponse.json([], { status: 200 });
  }
}
