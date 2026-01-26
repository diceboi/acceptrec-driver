
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientContacts } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and, ne } from 'drizzle-orm';
import { z } from 'zod';

const bodySchema = z.object({
  clientId: z.string().min(1),
});

export async function POST(
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

  const { id: contactId } = await params;

  try {
    const body = await req.json();
    const { clientId } = bodySchema.parse(body);

    // 1. Reset all others for this client
    await db
      .update(clientContacts)
      .set({ isPrimary: 0 })
      .where(and(
          eq(clientContacts.clientId, clientId),
          ne(clientContacts.id, contactId)
      ));

    // 2. Set target as primary
    const [updated] = await db
      .update(clientContacts)
      .set({ isPrimary: 1 })
      .where(eq(clientContacts.id, contactId))
      .returning();

    return NextResponse.json(updated);

  } catch (error: any) {
    console.error('Error setting primary contact:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
