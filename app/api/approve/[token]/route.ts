
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { approvalBatches, batchTimesheets, timesheets, clients } from '@/shared/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return new NextResponse("Token required", { status: 400 });
  }

  try {
    // 1. Find the batch by token
    const [batch] = await db
      .select()
      .from(approvalBatches)
      .where(eq(approvalBatches.approvalToken, token));

    if (!batch) {
      return new NextResponse("Invalid approval token", { status: 404 });
    }

    // Check expiry if you want strict security, though legacy code might not check it strictly
    if (new Date() > batch.approvalTokenExpiry) {
      return new NextResponse("Approval token expired", { status: 410 });
    }

    // 2. Fetch the client to get minimum billable hours
    let clientMinimumHours = 8; // Default
    if (batch.clientId) {
      const [clientRecord] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, batch.clientId));

      if (clientRecord) {
        clientMinimumHours = clientRecord.minimumBillableHours;
      }
    }

    // 3. Fetch linked timesheets
    // Perform a join to get relevant timesheets
    const batchData = await db
      .select({
        timesheet: timesheets
      })
      .from(batchTimesheets)
      .innerJoin(timesheets, eq(batchTimesheets.timesheetId, timesheets.id))
      .where(eq(batchTimesheets.batchId, batch.id));

    const rawTimesheetList = batchData.map(d => d.timesheet);

    let rateMap = new Map<string, number>();
    if (batch.clientId) {
      const { driverClassRates } = await import('@/shared/schema');
      const classRates = await db
        .select({
          classId: driverClassRates.driverClassId,
          hourlyRate: driverClassRates.hourlyRate,
        })
        .from(driverClassRates)
        .where(eq(driverClassRates.clientId, batch.clientId));
      
      for (const cr of classRates) {
        rateMap.set(cr.classId, cr.hourlyRate);
      }
    }

    const timesheetList = rawTimesheetList.map(ts => {
      const driverClassesByDay = (ts.driverClassesByDay as Record<string, string>) || {};
      const dayRates: Record<string, number | null> = {};
      const dayRevenues: Record<string, number> = {};
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      days.forEach(day => {
        const classId = driverClassesByDay[day];
        const rate = classId ? (rateMap.get(classId) ?? null) : null;
        dayRates[day] = rate;
        
        const dayTotal = parseFloat((ts as any)[`${day}Total`] || "0");
        const disableMinHours = (ts as any)[`${day}DisableMinHours`] || false;
        const minHours = disableMinHours ? 0 : 8;
        const billableHours = dayTotal > 0 ? Math.max(dayTotal, minHours) : 0;
        
        dayRevenues[day] = rate && billableHours > 0 ? rate * billableHours : 0;
      });

      return {
        ...ts,
        dayRates,
        dayRevenues,
      };
    });

    return NextResponse.json({
      batch: {
        ...batch,
        minimumBillableHours: clientMinimumHours
      },
      timesheets: timesheetList
    });

  } catch (error) {
    console.error('Error fetching approval batch:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
