import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { approvalBatches, approvalAuditLog, clients, clientContacts } from '@/shared/schema';
import { createClient } from '@/lib/supabase/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const sendEmailSchema = z.object({
  recipientEmail: z.string().email().optional(),
});

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
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
    const { recipientEmail } = sendEmailSchema.parse(body);

    // 1. Fetch Batch
    const batches = await db.select().from(approvalBatches).where(eq(approvalBatches.id, params.id)).limit(1);
    const batch = batches[0];

    if (!batch) {
      return new NextResponse("Batch not found", { status: 404 });
    }

    // 2. Determine Email Recipient
    let emailToSendTo = recipientEmail;

    if (!emailToSendTo) {
      // Fetch primary contact email if not provided
      if (batch.clientId) {
        const primaryContactResult = await db
            .select({ email: clientContacts.email })
            .from(clientContacts)
            .where(and(
                eq(clientContacts.clientId, batch.clientId),
                eq(clientContacts.isPrimary, 1) // Using 1 for true
            ))
            .limit(1);
            
        if (primaryContactResult.length > 0) {
            emailToSendTo = primaryContactResult[0].email;
        } else {
             // Fallback to client email (legacy)
            const clientResult = await db
                .select({ email: clients.email })
                .from(clients)
                .where(eq(clients.id, batch.clientId))
                .limit(1);
            
            if (clientResult.length > 0 && clientResult[0].email) {
                emailToSendTo = clientResult[0].email;
            }
        }
      }
    }

    if (!emailToSendTo) {
      return new NextResponse("No recipient email found for this client", { status: 400 });
    }

    // 3. Construct Approval Link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const approvalLink = `${baseUrl}/approve/${batch.approvalToken}`;

    // 4. Send Email
    try {
        const { sendApprovalEmail } = await import('@/lib/email');
        await sendApprovalEmail({
            to: emailToSendTo,
            clientName: batch.clientName,
            weekStartDate: batch.weekStartDate,
            approvalLink
        });
    } catch (emailError) {
        console.error("Failed to send email:", emailError);
        return new NextResponse("Failed to send email", { status: 500 });
    }

    // 5. Update Batch Status (if pending)
    if (batch.status === 'pending') {
        // We keep it pending until opened/approved, but update sentAt
    }
    
    // Update sentAt
    await db.update(approvalBatches)
        .set({ sentAt: new Date() })
        .where(eq(approvalBatches.id, batch.id));

    // 6. Add Audit Log
    await db.insert(approvalAuditLog).values({
      batchId: batch.id,
      action: 'email_resent',
      performedBy: user.id, // User UUID from auth
      notes: `Email resent to ${emailToSendTo}`,
    });

    return NextResponse.json({ message: "Email sent successfully", recipient: emailToSendTo });

  } catch (error) {
    console.error('Error sending approval email:', error);
    if (error instanceof z.ZodError) {
        return new NextResponse("Invalid input", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
