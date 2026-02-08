
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { approvalBatches } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = user.user_metadata?.role;
  
  // Check for impersonation (super_admin viewing as client)
  const { searchParams } = new URL(req.url);
  const impersonateClientId = searchParams.get('impersonateClientId');
  
  let effectiveClientId: string | undefined;
  
  if (impersonateClientId && role === 'super_admin') {
    // Super admin impersonating a client
    effectiveClientId = impersonateClientId;
  } else if (role === 'client') {
    // Real client user
    effectiveClientId = user.user_metadata?.client_id || user.user_metadata?.clientId;
  } else {
    // Not a client and not impersonating
    return new NextResponse("Forbidden", { status: 403 });
  }
  
  if (!effectiveClientId) {
    return new NextResponse("Client ID not found", { status: 400 });
  }

  try {
    const batches = await db
      .select()
      .from(approvalBatches)
      .where(eq(approvalBatches.clientId, effectiveClientId))
      .orderBy(desc(approvalBatches.weekStartDate)); // Recent weeks first

    return NextResponse.json(batches);
  } catch (error) {
    console.error('Error fetching approval batches:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
