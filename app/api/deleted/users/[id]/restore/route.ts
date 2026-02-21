import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { users } from '@/shared/schema';
import { eq } from 'drizzle-orm';
import { writeAuditLog, auditUserName } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { id } = await params;

    const { error } = await supabase
      .from('users')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id);

    if (error) {
      console.error('Error restoring user:', error);
      return NextResponse.json(
        { error: 'Failed to restore user' },
        { status: 500 }
      );
    }

    const [restored] = await db.select().from(users).where(eq(users.id, id));

    await writeAuditLog({
      userId: currentUser?.id ?? null,
      userEmail: currentUser?.email ?? null,
      userName: currentUser ? auditUserName(currentUser) : null,
      action: 'restore',
      entityType: 'user',
      entityId: id,
      entityName: restored
        ? `${restored.firstName} ${restored.lastName} (${restored.email})`
        : id,
      notes: 'User restored from deleted items',
      req: request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring user:', error);
    return NextResponse.json(
      { error: 'Failed to restore user' },
      { status: 500 }
    );
  }
}
