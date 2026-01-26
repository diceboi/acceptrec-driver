
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientContacts, insertClientContactSchema } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq } from 'drizzle-orm';

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
    const validatedData = insertClientContactSchema.partial().omit({ clientId: true }).parse(body);

    const [updatedContact] = await db
      .update(clientContacts)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(clientContacts.id, id))
      .returning();

    return NextResponse.json(updatedContact);

  } catch (error: any) {
    console.error('Error updating contact:', error);
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
    await db
      .delete(clientContacts)
      .where(eq(clientContacts.id, id));

    return new NextResponse("Contact deleted", { status: 200 });

  } catch (error) {
    console.error('Error deleting contact:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
