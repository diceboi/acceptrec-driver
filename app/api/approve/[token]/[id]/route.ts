
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { approvalBatches, batchTimesheets, timesheets } from '@/shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Schema for approval (from legacy code)
const approveSchema = z.object({
  approvedBy: z.string().min(1, "Approver name is required"),
  rating: z.number().optional(),
  comments: z.string().optional(),
  modifications: z.record(z.string(), z.any()).optional(), // For edited times
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id: timesheetId } = await params;

  try {
    const body = await req.json();
    const { approvedBy, rating, comments, modifications } = approveSchema.parse(body);

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

    // 2. Verify Timesheet is in this Batch
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
        approvalStatus: 'approved',
        clientApprovedAt: new Date(),
        clientApprovedBy: approvedBy,
        clientRating: rating,
        clientComments: comments,
        clientModifications: modifications || null,
        // If approval logic requires updating the batch status (e.g. to 'partial' or 'completed'), 
        // that logic should ideally be here or in a trigger.
        // For now, we just update the timesheet.
      })
      .where(eq(timesheets.id, timesheetId))
      .returning();

    return NextResponse.json(updated);

  } catch (error) {
    console.error('Error approving timesheet via token:', error);
    if (error instanceof z.ZodError) {
        return new NextResponse("Invalid input", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
