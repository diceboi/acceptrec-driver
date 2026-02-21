
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clients, insertClientSchema } from '@/shared/schema';
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
    const validatedData = insertClientSchema.partial().parse(body);

    const [before] = await db.select().from(clients).where(eq(clients.id, id));

    const [updatedClient] = await db
      .update(clients)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();

    const changedFields: Record<string, { before: unknown; after: unknown }> = {};
    for (const key of Object.keys(validatedData) as (keyof typeof validatedData)[]) {
      if (before && (before as any)[key] !== (updatedClient as any)[key]) {
        changedFields[key] = { before: (before as any)[key], after: (updatedClient as any)[key] };
      }
    }

    await writeAuditLog({
      userId: user.id,
      userEmail: user.email ?? null,
      userName: auditUserName(user),
      action: 'update',
      entityType: 'client',
      entityId: id,
      entityName: updatedClient?.companyName ?? id,
      changes: Object.keys(changedFields).length > 0 ? changedFields : null,
      notes: 'Client details updated',
      req,
    });

    return NextResponse.json(updatedClient);

  } catch (error: any) {
    console.error('Error updating client:', error);
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
    const [deletedClient] = await db
      .update(clients)
      .set({
        deletedAt: new Date(),
        deletedBy: user.id
      })
      .where(eq(clients.id, id))
      .returning();

    await writeAuditLog({
      userId: user.id,
      userEmail: user.email ?? null,
      userName: auditUserName(user),
      action: 'delete',
      entityType: 'client',
      entityId: id,
      entityName: deletedClient?.companyName ?? id,
      notes: 'Client moved to deleted items',
      req,
    });

    return new NextResponse("Client deleted", { status: 200 });

  } catch (error) {
    console.error('Error deleting client:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
