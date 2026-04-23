
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets, batchTimesheets, approvalBatches, users } from '@/shared/schema';
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

    const { inArray } = await import('drizzle-orm');
    
    // Evaluate queries sequentially to prevent pool exhaustion or locks when max: 1
    const timesheetData = await db.select().from(timesheets).where(inArray(timesheets.id, timesheetIds));
    const allUsers = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName }).from(users);

    // Build a name map so we show the proper full name instead of the stored email-based driverName
    const userNameMap = new Map<string, string>();
    for (const u of allUsers) {
      const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
      if (fullName) userNameMap.set(u.id, fullName);
    }

    // Fetch driver class rates for this client
    const { driverClasses, driverClassRates } = await import('@/shared/schema');
    const classRates = await db
      .select({
        classId: driverClassRates.driverClassId,
        hourlyRate: driverClassRates.hourlyRate,
      })
      .from(driverClassRates)
      .where(eq(driverClassRates.clientId, effectiveClientId));

    const rateMap = new Map<string, number>();
    for (const cr of classRates) {
      rateMap.set(cr.classId, cr.hourlyRate);
    }

    const result = timesheetData.map(ts => {
      // Calculate rates and revenue per day
      const driverClassesByDay = (ts.driverClassesByDay as Record<string, string>) || {};
      const dayRates: Record<string, number | null> = {};
      const dayRevenues: Record<string, number> = {};
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      days.forEach(day => {
        const classId = driverClassesByDay[day];
        const rate = classId ? (rateMap.get(classId) ?? null) : null;
        dayRates[day] = rate;
        
        // Calculate revenue
        const dayTotal = parseFloat((ts as any)[`${day}Total`] || "0");
        const actHours = dayTotal;
        const disableMinHours = (ts as any)[`${day}DisableMinHours`] || false;
        
        // Simplified fallback for minimum hours (could be enhanced if needed)
        // Usually min hours is 8 unless disabled or actual is 0
        const minHours = disableMinHours ? 0 : 8;
        const billableHours = actHours > 0 ? Math.max(actHours, minHours) : 0;
        
        dayRevenues[day] = rate && billableHours > 0 ? rate * billableHours : 0;
      });

      return {
        ...ts,
        driverName: userNameMap.get(ts.userId) ?? ts.driverName,
        dayRates,
        dayRevenues,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching batch timesheets:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
