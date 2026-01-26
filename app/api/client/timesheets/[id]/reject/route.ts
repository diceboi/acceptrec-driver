
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets, batchTimesheets, approvalBatches } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const rejectSchema = z.object({
  rating: z.number().min(1).max(10).optional(),
  comments: z.string().min(1, "Rejection reason is required"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = user.user_metadata?.role;
  const clientId = user.user_metadata?.client_id || user.user_metadata?.clientId;
  const approverName = user.user_metadata?.full_name || user.email;

  if (role !== 'client' || !clientId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id: timesheetId } = await params;

  try {
    const body = await req.json();
    const { rating, comments } = rejectSchema.parse(body);

    // Verify access (same logic as approve)
    const [link] = await db
      .select({
        batchId: batchTimesheets.batchId,
        clientId: approvalBatches.clientId
      })
      .from(batchTimesheets)
      .innerJoin(approvalBatches, eq(batchTimesheets.batchId, approvalBatches.id))
      .where(and(
        eq(batchTimesheets.timesheetId, timesheetId),
        eq(approvalBatches.clientId, clientId)
      ));

    let isValid = !!link;
    
    if (!isValid) {
        const [timesheet] = await db
            .select({ batchId: timesheets.batchId })
            .from(timesheets)
            .where(eq(timesheets.id, timesheetId));
            
        if (timesheet && timesheet.batchId) {
             const [batch] = await db
                .select()
                .from(approvalBatches)
                .where(and(eq(approvalBatches.id, timesheet.batchId), eq(approvalBatches.clientId, clientId)));
             if (batch) isValid = true;
        }
    }

    if (!isValid) {
      return new NextResponse("Timesheet not found or not accessible", { status: 404 });
    }

    // Perform Rejection
    const [updated] = await db
      .update(timesheets)
      .set({
        approvalStatus: 'rejected',
        clientApprovedAt: new Date(),
        clientApprovedBy: approverName,
        clientRating: rating,
        clientComments: comments,
      })
      .where(eq(timesheets.id, timesheetId))
      .returning();

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Error rejecting timesheet:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
