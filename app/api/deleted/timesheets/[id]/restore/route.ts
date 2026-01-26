import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;

    // Restore timesheet by setting deleted_at to null
    const { error } = await supabase
      .from('timesheets')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id);

    if (error) {
      console.error('Error restoring timesheet:', error);
      return NextResponse.json(
        { error: 'Failed to restore timesheet' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring timesheet:', error);
    return NextResponse.json(
      { error: 'Failed to restore timesheet' },
      { status: 500 }
    );
  }
}
