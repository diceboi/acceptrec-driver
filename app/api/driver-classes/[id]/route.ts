import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { driverClasses, insertDriverClassSchema } from '@/shared/schema';
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

  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const validatedData = insertDriverClassSchema.partial().parse(body);

    const [before] = await db.select().from(driverClasses).where(eq(driverClasses.id, id));

    const [updated] = await db
      .update(driverClasses)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(driverClasses.id, id))
      .returning();

    const changedFields: Record<string, { before: unknown; after: unknown }> = {};
    for (const key of Object.keys(validatedData) as (keyof typeof validatedData)[]) {
      if (before && (before as any)[key] !== (updated as any)[key]) {
        changedFields[key] = { before: (before as any)[key], after: (updated as any)[key] };
      }
    }

    await writeAuditLog({
      userId: user.id,
      userEmail: user.email ?? null,
      userName: auditUserName(user),
      action: 'update',
      entityType: 'client',
      entityId: id,
      entityName: updated?.name ?? id,
      changes: Object.keys(changedFields).length > 0 ? changedFields : null,
      notes: 'Driver class updated',
      req,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating driver class:', error);
    if (error.name === 'ZodError') {
      return new NextResponse("Invalid input", { status: 400 });
    }
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

  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;

  try {
    const [deleted] = await db
      .update(driverClasses)
      .set({
        deletedAt: new Date(),
        deletedBy: user.id,
      })
      .where(eq(driverClasses.id, id))
      .returning();

    await writeAuditLog({
      userId: user.id,
      userEmail: user.email ?? null,
      userName: auditUserName(user),
      action: 'delete',
      entityType: 'client',
      entityId: id,
      entityName: deleted?.name ?? id,
      notes: 'Driver class deleted',
      req,
    });

    return new NextResponse("Driver class deleted", { status: 200 });
  } catch (error) {
    console.error('Error deleting driver class:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
