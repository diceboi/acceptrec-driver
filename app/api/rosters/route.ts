import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rosters } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { desc, isNull } from 'drizzle-orm';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const allRosters = await db
      .select()
      .from(rosters)
      .where(isNull(rosters.deletedAt))
      .orderBy(desc(rosters.weekStartDate));

    return NextResponse.json(allRosters);
  } catch (error) {
    console.error('Error fetching rosters:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
