import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { driverClassRates, driverClasses } from '@/shared/schema';
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

  const { id } = await params;

  try {
    const rates = await db
      .select({
        id: driverClassRates.id,
        driverClassId: driverClassRates.driverClassId,
        clientId: driverClassRates.clientId,
        hourlyRate: driverClassRates.hourlyRate,
        driverClassName: driverClasses.name,
      })
      .from(driverClassRates)
      .innerJoin(driverClasses, eq(driverClassRates.driverClassId, driverClasses.id))
      .where(
        and(
          eq(driverClassRates.clientId, id),
          isNull(driverClasses.deletedAt)
        )
      );

    return NextResponse.json(rates);
  } catch (error) {
    console.error('Error fetching client driver class rates:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
