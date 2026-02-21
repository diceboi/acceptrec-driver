import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { timesheets } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { writeAuditLog, auditUserName } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { id } = await params;

    const { error } = await supabase
      .from('timesheets')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id);

    if (error) {
      console.error('Error restoring timesheet:', error);
      return NextResponse.json(
        { error: 'Failed to restore timesheet' },
        { status: 500 }
      );
    }

    // Fetch restored record for audit name
    const [restored] = await db.select().from(timesheets).where(eq(timesheets.id, id));

    await writeAuditLog({
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      userName: user ? auditUserName(user) : null,
      action: 'restore',
      entityType: 'timesheet',
      entityId: id,
      entityName: restored
        ? `${restored.driverName} – week ${restored.weekStartDate}`
        : id,
      notes: 'Timesheet restored from deleted items',
      req: request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to restore timesheet' },
      { status: 500 }
    );
  }
}
