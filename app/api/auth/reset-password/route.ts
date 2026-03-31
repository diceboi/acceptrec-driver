import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const supabase = createAdminClient();
        
        // Use the request origin to construct the absolute recovery link
        const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";

        // Generate the recovery link using the Supabase Admin API
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo: `${origin}/update-password`
            }
        });

        // We don't expose if the email exists to prevent user enumeration
        if (error) {
            console.error("Link generation error:", error);
            // Return success even if failed because user doesn't exist
            return NextResponse.json({ success: true, message: "If an account exists, a link was sent." });
        }

        const hashed_token = data.properties.hashed_token;

        if (!hashed_token) {
             console.error("Missing hashed token from generateLink");
             return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
        }

        // Construct the Next.js confirmation link that will ultimately redirect to /update-password
        const resetLink = `${origin}/auth/confirm?token_hash=${hashed_token}&type=recovery&next=/update-password`;

        // Send the email via Resend
        const { error: resendError } = await resend.emails.send({
            from: "Accept Recruitment <noreply@acceptrec.co.uk>", 
            to: email,
            subject: "Reset your password",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
                    <p>Click the button below to set a new password:</p>
                    <div style="margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">This link will expire soon.</p>
                    <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
                    <p style="color: #888; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="color: #888; font-size: 12px; word-break: break-all;">${resetLink}</p>
                </div>
            `,
        });

        if (resendError) {
             console.error("Resend error:", resendError);
             return NextResponse.json({ error: "Failed to send email via Resend" }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("Reset password handler error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
