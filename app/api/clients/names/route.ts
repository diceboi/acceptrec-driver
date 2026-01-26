
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clients } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { desc } from 'drizzle-orm';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const allClients = await db.select({ name: clients.clientName }).from(clients).orderBy(desc(clients.clientName));
    const names = allClients.map(c => c.name);
    
    return NextResponse.json(names);
  } catch (error) {
    console.error('Error fetching client names:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
