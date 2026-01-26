import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: timesheets, error } = await supabase
      .from('timesheets')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted timesheets:', error);
      return NextResponse.json([], { status: 200 });
    }

    // Transform to camelCase
    const transformedTimesheets = (timesheets || []).map(ts => ({
      id: ts.id,
      driverName: ts.driver_name,
      weekStartDate: ts.week_start_date,
      approvalStatus: ts.approval_status,
      deletedAt: ts.deleted_at,
      deletedBy: ts.deleted_by,
    }));

    return NextResponse.json(transformedTimesheets);
  } catch (error) {
    console.error('Error fetching deleted timesheets:', error);
    return NextResponse.json([], { status: 200 });
  }
}
