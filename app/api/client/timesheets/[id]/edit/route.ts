
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets, batchTimesheets, approvalBatches } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { syncBatchStatus } from '@/lib/sync-batch-status';

const editSchema = z.object({
  // Per-day editable fields
  mondayStart: z.string().optional(),
  mondayEnd: z.string().optional(),
  mondayBreak: z.string().optional(),
  mondayTotal: z.string().optional(),
  tuesdayStart: z.string().optional(),
  tuesdayEnd: z.string().optional(),
  tuesdayBreak: z.string().optional(),
  tuesdayTotal: z.string().optional(),
  wednesdayStart: z.string().optional(),
  wednesdayEnd: z.string().optional(),
  wednesdayBreak: z.string().optional(),
  wednesdayTotal: z.string().optional(),
  thursdayStart: z.string().optional(),
  thursdayEnd: z.string().optional(),
  thursdayBreak: z.string().optional(),
  thursdayTotal: z.string().optional(),
  fridayStart: z.string().optional(),
  fridayEnd: z.string().optional(),
  fridayBreak: z.string().optional(),
  fridayTotal: z.string().optional(),
  saturdayStart: z.string().optional(),
  saturdayEnd: z.string().optional(),
  saturdayBreak: z.string().optional(),
  saturdayTotal: z.string().optional(),
  sundayStart: z.string().optional(),
  sundayEnd: z.string().optional(),
  sundayBreak: z.string().optional(),
  sundayTotal: z.string().optional(),
  // Metadata
  editReason: z.string().min(1, 'Edit reason is required'),
  approveAfterEdit: z.boolean().default(false),
  rating: z.number().min(1).max(10).optional(),
  comments: z.string().optional(),
  impersonateClientId: z.string().optional(),
});

const editableFields = [
  'mondayStart', 'mondayEnd', 'mondayBreak', 'mondayTotal',
  'tuesdayStart', 'tuesdayEnd', 'tuesdayBreak', 'tuesdayTotal',
  'wednesdayStart', 'wednesdayEnd', 'wednesdayBreak', 'wednesdayTotal',
  'thursdayStart', 'thursdayEnd', 'thursdayBreak', 'thursdayTotal',
  'fridayStart', 'fridayEnd', 'fridayBreak', 'fridayTotal',
  'saturdayStart', 'saturdayEnd', 'saturdayBreak', 'saturdayTotal',
  'sundayStart', 'sundayEnd', 'sundayBreak', 'sundayTotal',
] as const;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const role = user.user_metadata?.role;
  const body = await req.json();
  const impersonateClientId = body.impersonateClientId;

  let effectiveClientId: string | undefined;
  const approverName = user.user_metadata?.full_name || user.email;

  if (impersonateClientId && role === 'super_admin') {
    effectiveClientId = impersonateClientId;
  } else if (role === 'client') {
    effectiveClientId = user.user_metadata?.client_id || user.user_metadata?.clientId;
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }

  if (!effectiveClientId) {
    return new NextResponse('Client ID not found', { status: 400 });
  }

  const { id: timesheetId } = await params;

  try {
    const parsed = editSchema.parse(body);
    const { editReason, approveAfterEdit, rating, comments } = parsed;

    // Verify timesheet belongs to this client
    const [link] = await db
      .select({ batchId: batchTimesheets.batchId, clientId: approvalBatches.clientId })
      .from(batchTimesheets)
      .innerJoin(approvalBatches, eq(batchTimesheets.batchId, approvalBatches.id))
      .where(and(
        eq(batchTimesheets.timesheetId, timesheetId),
        eq(approvalBatches.clientId, effectiveClientId)
      ));

    let isValid = !!link;

    if (!isValid) {
      const [ts] = await db
        .select({ batchId: timesheets.batchId })
        .from(timesheets)
        .where(eq(timesheets.id, timesheetId));

      if (ts?.batchId) {
        const [batch] = await db
          .select()
          .from(approvalBatches)
          .where(and(eq(approvalBatches.id, ts.batchId), eq(approvalBatches.clientId, effectiveClientId)));
        if (batch) isValid = true;
      }
    }

    if (!isValid) {
      return new NextResponse('Timesheet not found or not accessible', { status: 404 });
    }

    // Load current timesheet to compute diff
    const [current] = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.id, timesheetId));

    if (!current) {
      return new NextResponse('Timesheet not found', { status: 404 });
    }

    // Build diff
    const changes: Record<string, { before: string; after: string }> = {};
    const updatePayload: Record<string, string> = {};

    for (const field of editableFields) {
      const newVal = parsed[field];
      if (newVal !== undefined) {
        const oldVal = String((current as any)[field] ?? '');
        if (newVal !== oldVal) {
          changes[field] = { before: oldVal, after: newVal };
        }
        updatePayload[field] = newVal;
      }
    }

    // Build DB update set
    const updateSet: Record<string, any> = {
      ...updatePayload,
      clientModifications: {
        editedAt: new Date().toISOString(),
        editedBy: approverName,
        reason: editReason,
        changes,
      },
    };

    if (approveAfterEdit) {
      updateSet.approvalStatus = 'approved';
      updateSet.clientApprovedAt = new Date();
      updateSet.clientApprovedBy = approverName;
      if (rating !== undefined) updateSet.clientRating = rating;
      if (comments !== undefined) updateSet.clientComments = comments;
    }

    const [updated] = await db
      .update(timesheets)
      .set(updateSet)
      .where(eq(timesheets.id, timesheetId))
      .returning();

    // Sync batch status so admin view reflects the current state
    await syncBatchStatus(timesheetId);

    // Send admin notification email (non-blocking)
    try {
      const { sendClientEditNotification } = await import('@/lib/email');
      await sendClientEditNotification({
        driverName: current.driverName,
        clientName: approverName ?? 'Client',
        weekStartDate: current.weekStartDate,
        editReason,
        changes,
        approvedAfterEdit: approveAfterEdit,
      });
    } catch (emailErr) {
      console.error('Failed to send client edit notification email:', emailErr);
      // Non-fatal – don't block the response
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error editing timesheet:', error);
    if (error instanceof z.ZodError) {
      return new NextResponse(error.message, { status: 400 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
