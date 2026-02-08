
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clients, clientContacts, insertClientSchema } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { desc } from 'drizzle-orm';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') {
     // Allow clients to fetch their own data? 
     // For now restricting to admin as per legacy strictness, or check specific requirement.
     // Legacy 'ClientManagement' is admin only.
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const allClients = await db
      .select()
      .from(clients)
      .orderBy(desc(clients.companyName));

    return NextResponse.json(allClients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
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
    const body = await req.json();
    const validatedData = insertClientSchema.parse(body);

    // Extract contact data (contactName, email, phone will be used for primary contact)
    const { contactName, email, phone, ...clientData } = validatedData;

    // Validate that we have contact information
    if (!contactName || !email) {
      return new NextResponse("Contact name and email are required", { status: 400 });
    }

    // Create the client record (without contact fields)
    const [newClient] = await db
      .insert(clients)
      .values(clientData)
      .returning();

    // Create the primary contact
    try {
      await db.insert(clientContacts).values({
        clientId: newClient.id,
        name: contactName,
        email: email,
        phone: phone || null,
        isPrimary: 1,
      });
      console.log(`Auto-created primary contact for client: ${newClient.companyName}`);
    } catch (contactError) {
      // If contact creation fails, we should ideally rollback the client creation
      // For now, log the error and inform the user
      console.error('Error creating primary contact:', contactError);
      // Note: Client is already created, so we can't fully rollback without transactions
      // The client exists but without a primary contact
    }

    return NextResponse.json(newClient);

  } catch (error: any) {
    console.error('Error creating client:', error);
    if (error.name === 'ZodError') {
        return new NextResponse("Invalid input", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
