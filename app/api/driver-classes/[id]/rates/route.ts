import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { driverClassRates, clients } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

const bulkRatesSchema = z.object({
  rates: z.array(z.object({
    clientId: z.string().min(1),
    hourlyRate: z.number().min(0),
    saturdayRate: z.number().min(0).default(0),
    sundayRate: z.number().min(0).default(0),
    holidayRate: z.number().min(0).default(0),
  })),
});

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
    const rates = await db
      .select({
        id: driverClassRates.id,
        driverClassId: driverClassRates.driverClassId,
        clientId: driverClassRates.clientId,
        hourlyRate: driverClassRates.hourlyRate,
        saturdayRate: driverClassRates.saturdayRate,
        sundayRate: driverClassRates.sundayRate,
        holidayRate: driverClassRates.holidayRate,
        clientName: clients.companyName,
      })
      .from(driverClassRates)
      .innerJoin(clients, eq(driverClassRates.clientId, clients.id))
      .where(
        and(
          eq(driverClassRates.driverClassId, id),
          isNull(clients.deletedAt)
        )
      );

    return NextResponse.json(rates);
  } catch (error) {
    console.error('Error fetching driver class rates:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
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
    const body = await req.json();
    const { rates } = bulkRatesSchema.parse(body);

    // Upsert each rate — update if exists, insert if not
    const results = [];
    for (const rate of rates) {
      // Check if rate exists for this class + client
      const [existing] = await db
        .select()
        .from(driverClassRates)
        .where(
          and(
            eq(driverClassRates.driverClassId, id),
            eq(driverClassRates.clientId, rate.clientId)
          )
        );

      if (existing) {
        const [updated] = await db
          .update(driverClassRates)
          .set({ 
            hourlyRate: rate.hourlyRate, 
            saturdayRate: rate.saturdayRate,
            sundayRate: rate.sundayRate,
            holidayRate: rate.holidayRate,
            updatedAt: new Date() 
          })
          .where(eq(driverClassRates.id, existing.id))
          .returning();
        results.push(updated);
      } else {
        const [inserted] = await db
          .insert(driverClassRates)
          .values({
            driverClassId: id,
            clientId: rate.clientId,
            hourlyRate: rate.hourlyRate,
            saturdayRate: rate.saturdayRate,
            sundayRate: rate.sundayRate,
            holidayRate: rate.holidayRate,
          })
          .returning();
        results.push(inserted);
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error updating driver class rates:', error);
    if (error.name === 'ZodError') {
      return new NextResponse("Invalid input", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
