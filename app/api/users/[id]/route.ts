
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, clientContacts } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

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

    // 1. Update public.users
    // We only update fields that exist in the public.users table
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
        // If no DB fields changed (only password), fetch the current user to return it
        [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
    }

    // 2. Update Supabase Auth Metadata and Password
    const supabaseAdmin = createAdminClient();
    
    // Construct auth update object
    const authUpdates: any = {};
    
    // Handle Password Update
    if (data.password) {
        authUpdates.password = data.password;
    }

    // Handle Metadata Update
    const metadataUpdates: any = {};
    if (data.role) metadataUpdates.role = data.role;
    if (data.firstName || data.lastName) {
        if (data.firstName) metadataUpdates.firstName = data.firstName;
        if (data.lastName) metadataUpdates.lastName = data.lastName;
        // Approximation for full_name
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
    
    // 3. Automatically create a contact if the user is/becomes a client with a company assigned
    // This handles both cases:
    // - Role changes to 'client' and user already has a clientId
    // - ClientId is assigned and user is already a 'client'
    if (updatedUser) {
      const finalRole = updatedUser.role;
      const finalClientId = updatedUser.clientId;

      // Check if this user should have a contact (is client with company)
      if (finalRole === 'client' && finalClientId) {
        try {
          // Check if contact already exists with this email for this client
          const existingContact = await db.select()
            .from(clientContacts)
            .where(
              and(
                eq(clientContacts.clientId, finalClientId),
                eq(clientContacts.email, updatedUser.email)
              )
            )
            .limit(1);

          // Only create contact if it doesn't exist yet
          if (existingContact.length === 0) {
            await db.insert(clientContacts).values({
              clientId: finalClientId,
              name: `${updatedUser.firstName} ${updatedUser.lastName}`,
              email: updatedUser.email,
              phone: updatedUser.phone || null,
              isPrimary: 0, // Not primary by default
            });
            console.log(`Auto-created contact for client user: ${updatedUser.email}`);
          } else {
            console.log(`Contact already exists for ${updatedUser.email} at client ${finalClientId}`);
          }
        } catch (contactError) {
          // Log the error but don't fail the user update
          console.error('Error creating contact for client user:', contactError);
        }
      }
    }
    
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

  // Only Super Admin should ideally delete users, or at least Admin
  const role = currentUser.user_metadata?.role;
  if (role !== 'super_admin' && role !== 'admin') {
      // In legacy code admin could delete? Let's check permissions.
      // Assuming Admin can delete normal users.
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id: userId } = await params;

  if (userId === currentUser.id) {
       return new NextResponse("Cannot delete yourself", { status: 400 });
  }

  try {
    const supabaseAdmin = createAdminClient();

    // 1. Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
        console.error("Auth delete error:", authError);
        return new NextResponse("Failed to delete user from Auth system", { status: 500 });
    }
    
    // 2. Delete from public.users
    await db.delete(users).where(eq(users.id, userId));

    return new NextResponse("User deleted", { status: 200 });

  } catch (error) {
    console.error('Error deleting user:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
