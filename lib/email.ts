import { Resend } from 'resend';
import { render } from '@react-email/render';
import { TimesheetApprovalEmail } from '@/emails/TimesheetApprovalEmail';

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
