import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets, users, insertTimesheetSchema } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { writeAuditLog, auditUserName } from '@/lib/audit';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = user.user_metadata?.role || 'driver';

  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');
  const isPaginated = pageParam !== null || limitParam !== null;
  
  const page = parseInt(pageParam || '1', 10);
  const limitSize = parseInt(limitParam || '50', 10);
  const offset = (page - 1) * limitSize;

  try {
    if (role === 'admin' || role === 'super_admin') {
      const { sql } = await import('drizzle-orm');
      
      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(timesheets)
        .where(isNull(timesheets.deletedAt));
      const totalCount = Number(countResult.count);

      // Run queries sequentially to avoid locking the single-connection (max: 1) dev pool
      const allTimesheets = await db
        .select()
        .from(timesheets)
        .where(isNull(timesheets.deletedAt))
        .orderBy(desc(timesheets.weekStartDate))
        .limit(isPaginated ? limitSize : 1000)
        .offset(isPaginated ? offset : 0);
        
      const allUsers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      }).from(users);

      const userNameMap = new Map<string, string>();
      for (const u of allUsers) {
        const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
        if (fullName) userNameMap.set(u.id, fullName);
      }

      const result = allTimesheets.map(ts => ({
        ...ts,
        driverName: userNameMap.get(ts.userId) ?? ts.driverName,
      }));

      if (isPaginated) {
        return NextResponse.json({
          data: result,
          total: totalCount,
          page,
          limit: limitSize,
          totalPages: Math.ceil(totalCount / limitSize)
        });
      }
      return NextResponse.json(result);
    } else {
      const { sql } = await import('drizzle-orm');
      
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(timesheets)
        .where(and(
          eq(timesheets.userId, user.id),
          isNull(timesheets.deletedAt)
        ));
      const totalCount = Number(countResult.count);

      const userTimesheets = await db.select()
        .from(timesheets)
        .where(and(
          eq(timesheets.userId, user.id),
          isNull(timesheets.deletedAt)
        ))
        .orderBy(desc(timesheets.weekStartDate))
        .limit(isPaginated ? limitSize : 1000)
        .offset(isPaginated ? offset : 0);

      if (isPaginated) {
        return NextResponse.json({
          data: userTimesheets,
          total: totalCount,
          page,
          limit: limitSize,
          totalPages: Math.ceil(totalCount / limitSize)
        });
      }
      return NextResponse.json(userTimesheets);
    }
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = insertTimesheetSchema.parse(body);

    const [newTimesheet] = await db.insert(timesheets).values({
      ...validatedData,
      userId: user.id,
    }).returning();

    await writeAuditLog({
      userId: user.id,
      userEmail: user.email ?? null,
      userName: auditUserName(user),
      action: 'create',
      entityType: 'timesheet',
      entityId: newTimesheet.id,
      entityName: `${newTimesheet.driverName} – week ${newTimesheet.weekStartDate}`,
      notes: 'Driver submitted a new timesheet',
      req,
    });

    return NextResponse.json(newTimesheet);
  } catch (error: any) {
    console.error('Error creating timesheet:', error);
    if (error.name === 'ZodError') {
      return new NextResponse(JSON.stringify({ message: "Validation failed", errors: error.errors }), { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
