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

    // Restore client by setting deleted_at to null
    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', id);

    if (error) {
      console.error('Error restoring client:', error);
      return NextResponse.json(
        { error: 'Failed to restore client' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring client:', error);
    return NextResponse.json(
      { error: 'Failed to restore client' },
      { status: 500 }
    );
  }
}
