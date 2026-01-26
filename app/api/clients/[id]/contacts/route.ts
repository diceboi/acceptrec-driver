
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientContacts, insertClientContactSchema } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, desc } from 'drizzle-orm';

export async function GET(
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
  
  const { id: clientId } = await params;

  try {
    const contacts = await db
      .select()
      .from(clientContacts)
      .where(eq(clientContacts.clientId, clientId))
      .orderBy(desc(clientContacts.isPrimary), desc(clientContacts.createdAt));

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching client contacts:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

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

  const { id: clientId } = await params;

  try {
    const body = await req.json();
    // input usually doesn't have clientId, or matches param
    const { clientId: bodyClientId, ...data } = body;
    
    const validatedData = insertClientContactSchema.omit({ clientId: true }).parse(data);

    const [newContact] = await db
      .insert(clientContacts)
      .values({
          ...validatedData,
          clientId: clientId
      })
      .returning();

    return NextResponse.json(newContact);

  } catch (error: any) {
    console.error('Error creating client contact:', error);
     if (error.name === 'ZodError') {
        return new NextResponse("Invalid input", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
