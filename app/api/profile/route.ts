import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq } from 'drizzle-orm';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    if (!dbUser) {
      return new NextResponse("User not found", { status: 404 });
    }

    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      phone: dbUser.phone,
      role: dbUser.role,
      createdAt: dbUser.createdAt,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { phone, firstName, lastName } = body;

    const updateData: any = { updatedAt: new Date() };
    
    if (phone !== undefined) updateData.phone = phone;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id))
      .returning();

    if (!updated) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Also update Supabase user metadata
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        full_name: `${updated.firstName || ''} ${updated.lastName || ''}`.trim(),
        first_name: updated.firstName,
        last_name: updated.lastName,
        phone: updated.phone,
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
