
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { approvalBatches } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = user.user_metadata?.role;
  const clientId = user.user_metadata?.client_id || user.user_metadata?.clientId;

  if (role !== 'client' || !clientId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const batches = await db
      .select()
      .from(approvalBatches)
      .where(eq(approvalBatches.clientId, clientId))
      .orderBy(desc(approvalBatches.weekStartDate)); // Recent weeks first

    return NextResponse.json(batches);
  } catch (error) {
    console.error('Error fetching approval batches:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
