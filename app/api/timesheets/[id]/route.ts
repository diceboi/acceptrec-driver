import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets, insertTimesheetSchema } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq } from 'drizzle-orm';
import { writeAuditLog, auditUserName } from '@/lib/audit';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return new NextResponse("Missing ID", { status: 400 });
  }

  try {
    const body = await req.json();
    const validatedData = insertTimesheetSchema.partial().parse(body);

    // Fetch current state for the changes diff
    const [before] = await db.select().from(timesheets).where(eq(timesheets.id, id));

    const [updatedTimesheet] = await db
      .update(timesheets)
      .set(validatedData)
      .where(eq(timesheets.id, id))
      .returning();

    if (!updatedTimesheet) {
      return new NextResponse("Timesheet not found", { status: 404 });
    }

    // Determine what changed
    const changedFields: Record<string, { before: unknown; after: unknown }> = {};
    for (const key of Object.keys(validatedData) as (keyof typeof validatedData)[]) {
      const bVal = before ? before[key] : undefined;
      const aVal = updatedTimesheet[key];
      if (bVal !== aVal) {
        changedFields[key] = { before: bVal, after: aVal };
      }
    }

    const approvalChange = changedFields['approvalStatus'];
    let action: 'approve' | 'reject' | 'update' = 'update';
    let notes = 'Timesheet updated';
    if (approvalChange) {
      if (approvalChange.after === 'approved') { action = 'approve'; notes = 'Timesheet approved'; }
      else if (approvalChange.after === 'rejected') { action = 'reject'; notes = 'Timesheet rejected'; }
    }

    await writeAuditLog({
      userId: user.id,
      userEmail: user.email ?? null,
      userName: auditUserName(user),
      action,
      entityType: 'timesheet',
      entityId: updatedTimesheet.id,
      entityName: `${updatedTimesheet.driverName} – week ${updatedTimesheet.weekStartDate}`,
      changes: Object.keys(changedFields).length > 0 ? changedFields : null,
      notes,
      req,
    });

    return NextResponse.json(updatedTimesheet);
  } catch (error: any) {
    console.error('Error updating timesheet:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return new NextResponse("Missing ID", { status: 400 });
  }

  try {
    const [deletedTimesheet] = await db
      .update(timesheets)
      .set({
        deletedAt: new Date(),
        deletedBy: user.id,
      })
      .where(eq(timesheets.id, id))
      .returning();

    if (!deletedTimesheet) {
      return new NextResponse("Timesheet not found", { status: 404 });
    }

    await writeAuditLog({
      userId: user.id,
      userEmail: user.email ?? null,
      userName: auditUserName(user),
      action: 'delete',
      entityType: 'timesheet',
      entityId: deletedTimesheet.id,
      entityName: `${deletedTimesheet.driverName} – week ${deletedTimesheet.weekStartDate}`,
      notes: 'Timesheet moved to deleted items',
      req,
    });

    return new NextResponse("Timesheet deleted (moved to deleted items)", { status: 200 });
  } catch (error) {
    console.error('Error deleting timesheet:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
