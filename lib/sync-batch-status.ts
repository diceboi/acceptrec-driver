import { db } from '@/lib/db';
import { approvalBatches, batchTimesheets, timesheets } from '@/shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Recalculates and updates the approval batch status based on the current
 * approval status of all its linked timesheets.
 *
 * Rules:
 *  - All approved             → 'approved'
 *  - All rejected             → 'rejected'
 *  - Mix of approved+rejected → 'partial'
 *  - Any still pending        → 'pending'
 */
export async function syncBatchStatus(timesheetId: string): Promise<void> {
  try {
    // 1. Find the batch this timesheet belongs to
    // Try junction table first
    const [link] = await db
      .select({ batchId: batchTimesheets.batchId })
      .from(batchTimesheets)
      .where(eq(batchTimesheets.timesheetId, timesheetId));

    let batchId: string | null = link?.batchId ?? null;

    // Fallback: check direct batchId on timesheet
    if (!batchId) {
      const [ts] = await db
        .select({ batchId: timesheets.batchId })
        .from(timesheets)
        .where(eq(timesheets.id, timesheetId));
      batchId = ts?.batchId ?? null;
    }

    if (!batchId) return; // Not part of a batch – nothing to do

    // 2. Get all timesheets in this batch
    const batchTs = await db
      .select({ approvalStatus: timesheets.approvalStatus })
      .from(batchTimesheets)
      .innerJoin(timesheets, eq(batchTimesheets.timesheetId, timesheets.id))
      .where(eq(batchTimesheets.batchId, batchId));

    // Fallback: query directly by batchId if junction table returns nothing
    const allTimesheets = batchTs.length > 0
      ? batchTs
      : await db
          .select({ approvalStatus: timesheets.approvalStatus })
          .from(timesheets)
          .where(eq(timesheets.batchId, batchId));

    if (allTimesheets.length === 0) return;

    const statuses = allTimesheets.map(t => t.approvalStatus);
    const total = statuses.length;
    const approvedCount = statuses.filter(s => s === 'approved').length;
    const rejectedCount = statuses.filter(s => s === 'rejected').length;
    const pendingCount = total - approvedCount - rejectedCount;

    let newBatchStatus: string;

    if (pendingCount > 0) {
      newBatchStatus = 'pending';
    } else if (approvedCount === total) {
      newBatchStatus = 'approved';
    } else if (rejectedCount === total) {
      newBatchStatus = 'rejected';
    } else {
      // Mix of approved and rejected, no pending
      newBatchStatus = 'partial';
    }

    // 3. Update the batch status
    await db
      .update(approvalBatches)
      .set({ status: newBatchStatus })
      .where(eq(approvalBatches.id, batchId));

  } catch (err) {
    // Non-fatal: log but don't let this break the main operation
    console.error('syncBatchStatus error:', err);
  }
}
