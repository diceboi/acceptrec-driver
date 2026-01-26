import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rosters, rosterEntries, timesheets } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and, isNull } from 'drizzle-orm';

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

  const { id } = await params;

  try {
    // Get roster
    const [roster] = await db
      .select()
      .from(rosters)
      .where(and(eq(rosters.id, id), isNull(rosters.deletedAt)));

    if (!roster) {
      return new NextResponse("Roster not found", { status: 404 });
    }

    // Get entries
    const entries = await db
      .select()
      .from(rosterEntries)
      .where(eq(rosterEntries.rosterId, id));

    // Check submission status for each entry
    const entriesWithStatus = await Promise.all(
      entries.map(async (entry) => {
        if (!entry.userId) {
          return {
            ...entry,
            hasSubmitted: false,
            timesheetId: undefined,
          };
        }

        // Check if user has submitted timesheet for this week
        const [timesheet] = await db
          .select()
          .from(timesheets)
          .where(
            and(
              eq(timesheets.userId, entry.userId),
              eq(timesheets.weekStartDate, roster.weekStartDate),
              isNull(timesheets.deletedAt)
            )
          );

        return {
          ...entry,
          hasSubmitted: !!timesheet,
          timesheetId: timesheet?.id,
        };
      })
    );

    return NextResponse.json({
      ...roster,
      entries: entriesWithStatus,
    });
  } catch (error) {
    console.error('Error fetching roster details:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
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

  const { id } = await params;

  try {
    // Soft delete
    await db
      .update(rosters)
      .set({
        deletedAt: new Date(),
        deletedBy: user.id,
      })
      .where(eq(rosters.id, id));

    return new NextResponse("Roster deleted", { status: 200 });
  } catch (error) {
    console.error('Error deleting roster:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
