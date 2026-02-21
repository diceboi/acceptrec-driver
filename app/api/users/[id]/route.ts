
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, clientContacts } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { writeAuditLog, auditUserName } from '@/lib/audit';

const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['driver', 'client', 'admin', 'super_admin']).optional(),
  clientId: z.string().nullable().optional(),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = currentUser.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id: userId } = await params;

  try {
    const body = await req.json();
    const data = updateUserSchema.parse(body);

    // Fetch current user state for change tracking
    const [beforeUser] = await db.select().from(users).where(eq(users.id, userId));

    const dbUpdateData: any = {};
    if (data.firstName) dbUpdateData.firstName = data.firstName;
    if (data.lastName) dbUpdateData.lastName = data.lastName;
    if (data.role) dbUpdateData.role = data.role;
    if (data.clientId !== undefined) dbUpdateData.clientId = data.clientId;
    if (data.phone) dbUpdateData.phone = data.phone;

    let updatedUser = null;
    if (Object.keys(dbUpdateData).length > 0) {
      [updatedUser] = await db
        .update(users)
        .set(dbUpdateData)
        .where(eq(users.id, userId))
        .returning();
    } else {
      [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
    }

    const supabaseAdmin = createAdminClient();

    const authUpdates: any = {};

    if (data.password) {
      authUpdates.password = data.password;
    }

    const metadataUpdates: any = {};
    if (data.role) metadataUpdates.role = data.role;
    if (data.firstName || data.lastName) {
      if (data.firstName) metadataUpdates.firstName = data.firstName;
      if (data.lastName) metadataUpdates.lastName = data.lastName;
      if (updatedUser) {
        metadataUpdates.full_name = `${updatedUser.firstName} ${updatedUser.lastName}`;
      }
    }
    if (data.clientId !== undefined) metadataUpdates.clientId = data.clientId;

    if (Object.keys(metadataUpdates).length > 0) {
      authUpdates.user_metadata = metadataUpdates;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
      if (updateError) {
        console.error("Auth update error:", updateError);
        return new NextResponse("Failed to update user in Auth system", { status: 500 });
      }
    }

    if (updatedUser) {
      const finalRole = updatedUser.role;
      const finalClientId = updatedUser.clientId;

      if (finalRole === 'client' && finalClientId) {
        try {
          const existingContact = await db.select()
            .from(clientContacts)
            .where(
              and(
                eq(clientContacts.clientId, finalClientId),
                eq(clientContacts.email, updatedUser.email)
              )
            )
            .limit(1);

          if (existingContact.length === 0) {
            await db.insert(clientContacts).values({
              clientId: finalClientId,
              name: `${updatedUser.firstName} ${updatedUser.lastName}`,
              email: updatedUser.email,
              phone: updatedUser.phone || null,
              isPrimary: 0,
            });
          }
        } catch (contactError) {
          console.error('Error creating contact for client user:', contactError);
        }
      }
    }

    // Build audit changes
    const changedFields: Record<string, { before: unknown; after: unknown }> = {};
    const trackFields = ['firstName', 'lastName', 'role', 'clientId', 'phone'] as const;
    for (const field of trackFields) {
      if (data[field] !== undefined && beforeUser && beforeUser[field] !== (updatedUser as any)?.[field]) {
        changedFields[field] = { before: (beforeUser as any)[field], after: (updatedUser as any)?.[field] };
      }
    }
    if (data.password) changedFields['password'] = { before: '***', after: '*** (changed)' };

    const isRoleChange = !!changedFields['role'];
    const targetName = updatedUser
      ? `${updatedUser.firstName} ${updatedUser.lastName} (${updatedUser.email})`
      : userId;

    await writeAuditLog({
      userId: currentUser.id,
      userEmail: currentUser.email ?? null,
      userName: auditUserName(currentUser),
      action: isRoleChange ? 'role_change' : 'update',
      entityType: 'user',
      entityId: userId,
      entityName: targetName,
      changes: Object.keys(changedFields).length > 0 ? changedFields : null,
      notes: isRoleChange
        ? `Role changed to ${data.role}`
        : 'User profile updated by admin',
      req,
    });

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof z.ZodError) {
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
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = currentUser.user_metadata?.role;
  if (role !== 'super_admin' && role !== 'admin') {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id: userId } = await params;

  if (userId === currentUser.id) {
    return new NextResponse("Cannot delete yourself", { status: 400 });
  }

  try {
    const [deletedUser] = await db
      .update(users)
      .set({
        deletedAt: new Date(),
        deletedBy: currentUser.id,
      })
      .where(eq(users.id, userId))
      .returning();

    if (!deletedUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    await writeAuditLog({
      userId: currentUser.id,
      userEmail: currentUser.email ?? null,
      userName: auditUserName(currentUser),
      action: 'delete',
      entityType: 'user',
      entityId: deletedUser.id,
      entityName: `${deletedUser.firstName} ${deletedUser.lastName} (${deletedUser.email})`,
      notes: 'User moved to deleted items',
      req,
    });

    return new NextResponse("User deleted (moved to deleted items)", { status: 200 });

  } catch (error) {
    console.error('Error deleting user:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
