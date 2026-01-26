
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clients, users } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq } from 'drizzle-orm';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = user.user_metadata?.role;
  const clientId = user.user_metadata?.client_id || user.user_metadata?.clientId;

  if (role !== 'client' || !clientId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const [client] = await db.select().from(clients).where(eq(clients.id, clientId));

    if (!client) {
      return new NextResponse("Client not found", { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Error fetching client info:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
