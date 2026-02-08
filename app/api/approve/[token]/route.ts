
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

    const timesheetList = batchData.map(d => d.timesheet);

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
