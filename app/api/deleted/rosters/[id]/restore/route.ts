import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Restore roster by setting deleted_at to null
    const { error } = await supabase
      .from('rosters')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id);

    if (error) {
      console.error('Error restoring roster:', error);
      return NextResponse.json(
        { error: 'Failed to restore roster' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring roster:', error);
    return NextResponse.json(
      { error: 'Failed to restore roster' },
      { status: 500 }
    );
  }
}
