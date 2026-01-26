
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { approvalBatches, batchTimesheets, timesheets, clients } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, desc, inArray } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

const createBatchSchema = z.object({
  clientName: z.string().min(1),
  weekStartDate: z.string().min(1),
  timesheetIds: z.array(z.string()).min(1),
  clientId: z.string().optional(),
  sendEmail: z.boolean().optional(),
  recipientEmails: z.array(z.string().email()).optional(),
});

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
    const batches = await db
      .select()
      .from(approvalBatches)
      .orderBy(desc(approvalBatches.createdAt));

    // Optional: Attach timesheet count to each batch if needed by frontend
    // For now returning basic batch info
    return NextResponse.json(batches);
  } catch (error) {
    console.error('Error fetching admin approval batches:', error);
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
    const { clientName, weekStartDate, timesheetIds, clientId, sendEmail, recipientEmails } = createBatchSchema.parse(body);

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30); // 30 day shelf life for token

    // 1. Create Batch
    const [batch] = await db
      .insert(approvalBatches)
      .values({
        clientId: clientId || null,
        clientName,
        weekStartDate,
        approvalToken: token,
        approvalTokenExpiry: expiry,
        createdBy: user.id || 'system', // schema expects uuid, user.id from supabase is uuid
        status: 'pending',
      })
      .returning();

    // 2. Link Timesheets
    if (timesheetIds.length > 0) {
      await db.insert(batchTimesheets).values(
        timesheetIds.map(tid => ({
            batchId: batch.id,
            timesheetId: tid
        }))
      );
      
      // Update timesheets status to 'pending_approval' and link batchId directly (legacy support)
      await db
        .update(timesheets)
        .set({
            approvalStatus: 'pending_approval',
            batchId: batch.id
        })
        .where(inArray(timesheets.id, timesheetIds));
    }

    // 3. Email Sending Logic (DISABLED per user request)
    // if (sendEmail && recipientEmails && recipientEmails.length > 0) {
    //    // console.log("Skipping email sending as requested.");
    // }

    return NextResponse.json({
        ...batch,
        approvalToken: token, // Return token so admin can copy it
        emailStatus: { sent: false, recipient: recipientEmails?.[0] } // Mock response
    });

  } catch (error) {
    console.error('Error creating approval batch:', error);
    if (error instanceof z.ZodError) {
        return new NextResponse("Invalid input", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
