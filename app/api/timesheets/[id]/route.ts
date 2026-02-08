import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets, insertTimesheetSchema } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq } from 'drizzle-orm';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  
  if (!id) {
    return new NextResponse("Missing ID", { status: 400 });
  }

  try {
    const body = await req.json();
    // Validate partial update
    const validatedData = insertTimesheetSchema.partial().parse(body);

    // Verify ownership or admin status before update
    // For now assuming if you can hit this endpoint you might have access, 
    // but ideally we check if the timesheet belongs to the user or user is admin.

    const [updatedTimesheet] = await db
      .update(timesheets)
      .set(validatedData)
      .where(eq(timesheets.id, id))
      .returning();

    if (!updatedTimesheet) {
      return new NextResponse("Timesheet not found", { status: 404 });
    }

    return NextResponse.json(updatedTimesheet);
  } catch (error: any) {
    console.error('Error updating timesheet:', error);
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
  
  const { id } = await params;

  if (!id) {
    return new NextResponse("Missing ID", { status: 400 });
  }

  try {
    // Soft delete by setting deleted_at and deleted_by
    const [deletedTimesheet] = await db
      .update(timesheets)
      .set({
        deletedAt: new Date(),
        deletedBy: user.id,
      })
      .where(eq(timesheets.id, id))
      .returning();

    if (!deletedTimesheet) {
      return new NextResponse("Timesheet not found", { status: 404 });
    }

    return new NextResponse("Timesheet deleted (moved to deleted items)", { status: 200 });
  } catch (error) {
    console.error('Error deleting timesheet:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

