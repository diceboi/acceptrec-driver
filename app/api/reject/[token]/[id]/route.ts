
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { approvalBatches, batchTimesheets, timesheets } from '@/shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const rejectSchema = z.object({
  approvedBy: z.string().min(1, "Approver name is required"),
  rating: z.number().optional(),
  comments: z.string().min(1, "Reason for rejection is required"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id: timesheetId } = await params;

  try {
    const body = await req.json();
    const { approvedBy, rating, comments } = rejectSchema.parse(body);

    // 1. Validate Token and Batch
    const [batch] = await db
      .select()
      .from(approvalBatches)
      .where(eq(approvalBatches.approvalToken, token));

    if (!batch) {
      return new NextResponse("Invalid token", { status: 403 });
    }
     if (new Date() > batch.approvalTokenExpiry) {
        return new NextResponse("Token expired", { status: 410 });
    }

    // 2. Verify Timesheet
    const [link] = await db
      .select()
      .from(batchTimesheets)
      .where(and(
        eq(batchTimesheets.batchId, batch.id),
        eq(batchTimesheets.timesheetId, timesheetId)
      ));

    if (!link) {
         // Fallback check direct link
        const [t] = await db.select().from(timesheets).where(eq(timesheets.id, timesheetId));
        if (!t || t.batchId !== batch.id) {
             return new NextResponse("Timesheet not found in this batch", { status: 404 });
        }
    }

    // 3. Update Timesheet
    const [updated] = await db
      .update(timesheets)
      .set({
        approvalStatus: 'rejected',
        clientApprovedAt: new Date(),
        clientApprovedBy: approvedBy,
        clientRating: rating,
        clientComments: comments,
      })
      .where(eq(timesheets.id, timesheetId))
      .returning();

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Error rejecting timesheet via token:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
