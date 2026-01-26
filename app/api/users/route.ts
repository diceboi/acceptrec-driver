
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { eq, desc } from 'drizzle-orm';
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
        username: data.email, // using email as username
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

    return NextResponse.json(dbUser);

  } catch (error) {
    console.error('Error creating user:', error);
     if (error instanceof z.ZodError) {
        return new NextResponse("Invalid input", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
