
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets, batchTimesheets, approvalBatches } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id: batchId } = await params;

  try {
    // Verify batch belongs to client
    const [batch] = await db
      .select()
      .from(approvalBatches)
      .where(and(
        eq(approvalBatches.id, batchId),
        eq(approvalBatches.clientId, effectiveClientId)
      ));

    if (!batch) {
        // Technically could be 404 or 403, but 404 is safer to not leak existence
      return new NextResponse("Batch not found", { status: 404 });
    }

    // Fetch timesheets linked to this batch
    // We join timesheets with batchTimesheets
    const batchTimesheetEntries = await db
      .select()
      .from(batchTimesheets)
      .where(eq(batchTimesheets.batchId, batchId));
      
    const timesheetIds = batchTimesheetEntries.map(entry => entry.timesheetId);

    if (timesheetIds.length === 0) {
      return NextResponse.json([]);
    }

    // In a real query builders usually support whereIn, Drizzle does via `inArray`
    // Importing inArray from drizzle-orm
    const { inArray } = await import('drizzle-orm');
    
    const timesheetData = await db
        .select()
        .from(timesheets)
        .where(inArray(timesheets.id, timesheetIds));

    return NextResponse.json(timesheetData);
  } catch (error) {
    console.error('Error fetching batch timesheets:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
