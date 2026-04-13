import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { driverClasses, insertDriverClassSchema } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { isNull } from 'drizzle-orm';
import { writeAuditLog, auditUserName } from '@/lib/audit';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const results = await db
      .select()
      .from(driverClasses)
      .where(isNull(driverClasses.deletedAt))
      .orderBy(driverClasses.name);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching driver classes:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = insertDriverClassSchema.parse(body);

    const [newClass] = await db
      .insert(driverClasses)
      .values(validatedData)
      .returning();

    await writeAuditLog({
      userId: user.id,
      userEmail: user.email ?? null,
      userName: auditUserName(user),
      action: 'create',
      entityType: 'client', // reusing closest entity type
      entityId: newClass.id,
      entityName: newClass.name,
      notes: `Driver class "${newClass.name}" created`,
      req,
    });

    return NextResponse.json(newClass, { status: 201 });
  } catch (error: any) {
    console.error('Error creating driver class:', error);
    if (error.name === 'ZodError') {
      return new NextResponse("Invalid input", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
