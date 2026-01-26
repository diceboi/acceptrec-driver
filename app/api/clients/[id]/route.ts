
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clients, insertClientSchema } from '@/shared/schema';
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
    const validatedData = insertClientSchema.partial().parse(body);

    const [updatedClient] = await db
      .update(clients)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();

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
    // Soft delete
    await db
      .update(clients)
      .set({ 
          deletedAt: new Date(),
          deletedBy: user.id
      })
      .where(eq(clients.id, id));

    return new NextResponse("Client deleted", { status: 200 });

  } catch (error) {
    console.error('Error deleting client:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
