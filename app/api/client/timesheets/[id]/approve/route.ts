
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets, batchTimesheets, approvalBatches } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const approveSchema = z.object({
  rating: z.number().min(1).max(10).optional(),
  comments: z.string().optional(),
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
    const { rating, comments } = approveSchema.parse(body);

    // Verify timesheet is linked to a batch belonging to this client
    // 1. Get timesheet's batch linkage
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

    // Also check if timesheet.batchId is set directly (schema has both junction and direct FK?)
    // Schema says: batchId: varchar("batch_id").references(...)
    // Let's check the schema again.
    // Yes: batchId: varchar("batch_id").references(() => approvalBatches.id, { onDelete: 'set null' }),
    // But there is also `batchTimesheets` junction table. 
    // The legacy code likely used the junction table OR the direct link.
    // Let's assume strict checking via the batch ownership.

    // If we can't find via junction, check direct batchId on timesheet
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

    // Perform Approval
    const [updated] = await db
      .update(timesheets)
      .set({
        approvalStatus: 'approved',
        clientApprovedAt: new Date(),
        clientApprovedBy: approverName,
        clientRating: rating,
        clientComments: comments,
      })
      .where(eq(timesheets.id, timesheetId))
      .returning();

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Error approving timesheet:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
