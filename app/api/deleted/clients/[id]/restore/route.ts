import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { clients } from '@/shared/schema';
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
      .from('clients')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id);

    if (error) {
      console.error('Error restoring client:', error);
      return NextResponse.json(
        { error: 'Failed to restore client' },
        { status: 500 }
      );
    }

    const [restored] = await db.select().from(clients).where(eq(clients.id, id));

    await writeAuditLog({
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      userName: user ? auditUserName(user) : null,
      action: 'restore',
      entityType: 'client',
      entityId: id,
      entityName: restored?.companyName ?? id,
      notes: 'Client restored from deleted items',
      req: request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring client:', error);
    return NextResponse.json(
      { error: 'Failed to restore client' },
      { status: 500 }
    );
  }
}
