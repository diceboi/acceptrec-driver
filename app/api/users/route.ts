
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, clientContacts, insertClientContactSchema } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['driver', 'client', 'admin', 'super_admin']).default('driver'),
  clientId: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = currentUser.user_metadata?.role;
  // Only admins can create users
  if (role !== 'admin' && role !== 'super_admin') {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createUserSchema.parse(body);

    const supabaseAdmin = createAdminClient();

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto confirm
      user_metadata: {
        role: data.role,
        full_name: `${data.firstName} ${data.lastName}`,
        firstName: data.firstName,
        lastName: data.lastName,
        clientId: data.clientId,
      }
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return new NextResponse(authError.message, { status: 400 });
    }

    if (!authUser.user) {
        return new NextResponse("Failed to create user in Auth system", { status: 500 });
    }

    // 2. Sync with public.users table
    // We use onConflict do update to ensure we don't fail if a trigger already inserted it
    // But basic insert is better if we assume no trigger or we want to ensure fields are set
    // Let's check if it exists first? No, insert on conflict is best.
    // Drizzle: .onConflictDoUpdate({ target: users.id, set: { ... } })
    
    const [dbUser] = await db.insert(users).values({
        id: authUser.user.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        clientId: data.clientId,
        phone: data.phone,
    }).onConflictDoUpdate({
        target: users.id,
        set: {
             firstName: data.firstName,
             lastName: data.lastName,
             role: data.role,
             clientId: data.clientId,
             phone: data.phone,
        }
    }).returning();

    // 3. Automatically create a contact if the user is a client with a company assigned
    if (data.role === 'client' && data.clientId) {
      try {
        // Check if contact already exists with this email for this client
        const existingContact = await db.select()
          .from(clientContacts)
          .where(
            and(
              eq(clientContacts.clientId, data.clientId),
              eq(clientContacts.email, data.email)
            )
          )
          .limit(1);

        // Only create contact if it doesn't exist yet
        if (existingContact.length === 0) {
          await db.insert(clientContacts).values({
            clientId: data.clientId,
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone || null,
            isPrimary: 0, // Not primary by default
          });
          console.log(`Auto-created contact for client user: ${data.email}`);
        } else {
          console.log(`Contact already exists for ${data.email} at client ${data.clientId}`);
        }
      } catch (contactError) {
        // Log the error but don't fail the user creation
        console.error('Error creating contact for client user:', contactError);
      }
    }

    return NextResponse.json(dbUser);

  } catch (error) {
    console.error('Error creating user:', error);
     if (error instanceof z.ZodError) {
        return new NextResponse("Invalid input", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
