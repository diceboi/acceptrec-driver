import { Resend } from 'resend';
import { render } from '@react-email/render';
import { TimesheetApprovalEmail } from '@/emails/TimesheetApprovalEmail';
import { ClientEditNotificationEmail } from '@/emails/ClientEditNotificationEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendApprovalEmail({
  to,
  clientName,
  weekStartDate,
  approvalLink
}: {
  to: string;
  clientName: string;
  weekStartDate: string;
  approvalLink: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Skipping email sending.");
    return { success: false, error: "Missing API Key" };
  }

  try {
    const emailHtml = await render(TimesheetApprovalEmail({ clientName, weekStartDate, approvalLink }));

    const { data, error } = await resend.emails.send({
      from: 'Accept Recruitment <timesheets@acceptrec.co.uk>',
      to: [to],
      subject: `Timesheet Approval Required - Week of ${weekStartDate}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend Error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Email sending failed:", err);
    return { success: false, error: err };
  }
}

export async function sendClientEditNotification({
  driverName,
  clientName,
  weekStartDate,
  editReason,
  changes,
  approvedAfterEdit,
}: {
  driverName: string;
  clientName: string;
  weekStartDate: string;
  editReason: string;
  changes: Record<string, { before: string; after: string }>;
  approvedAfterEdit: boolean;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set. Skipping client edit notification email.");
    return { success: false, error: "Missing API Key" };
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@acceptrec.co.uk';

  try {
    const emailHtml = await render(
      ClientEditNotificationEmail({ driverName, clientName, weekStartDate, editReason, changes, approvedAfterEdit })
    );

    const { data, error } = await resend.emails.send({
      from: 'Accept Recruitment <timesheets@acceptrec.co.uk>',
      to: [adminEmail],
      subject: `Client Edit: ${driverName} – Week of ${weekStartDate}${approvedAfterEdit ? ' (Approved)' : ''}`,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend Error (client edit notification):", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Client edit notification email failed:", err);
    return { success: false, error: err };
  }
}
