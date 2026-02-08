import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted clients:', error);
      return NextResponse.json([], { status: 200 });
    }

    // Transform to camelCase
    const transformedClients = (clients || []).map(client => ({
      id: client.id,
      companyName: client.company_name,
      contactName: client.contact_name,
      email: client.email,
      phone: client.phone,
      deletedAt: client.deleted_at,
      deletedBy: client.deleted_by,
    }));

    return NextResponse.json(transformedClients);
  } catch (error) {
    console.error('Error fetching deleted clients:', error);
    return NextResponse.json([], { status: 200 });
  }
}
