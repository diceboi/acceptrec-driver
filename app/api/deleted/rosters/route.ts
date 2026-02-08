import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: rosters, error } = await supabase
      .from('rosters')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted rosters:', error);
      return NextResponse.json([], { status: 200 });
    }

    // Transform to camelCase
    const transformedRosters = (rosters || []).map(roster => ({
      id: roster.id,
      weekStartDate: roster.week_start_date,
      fileName: roster.file_name,
      totalEntries: roster.total_entries,
      deletedAt: roster.deleted_at,
      deletedBy: roster.deleted_by,
    }));

    return NextResponse.json(transformedRosters);
  } catch (error) {
    console.error('Error fetching deleted rosters:', error);
    return NextResponse.json([], { status: 200 });
  }
}
