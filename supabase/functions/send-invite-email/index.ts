import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-id",
};

interface InviteEmailRequest {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteLink: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Evoltra <noreply@contact.evoltra.site>";
    if (!resendApiKey) {
      throw new Error("Resend is not configured");
    }

    const { to, inviterName, organizationName, role, inviteLink }: InviteEmailRequest = await req.json();

    if (!to || !organizationName || !inviteLink) {
      throw new Error("Missing required fields: to, organizationName, inviteLink");
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 32px; font-weight: bold;">E</span>
                </div>
                <h1 style="color: #18181b; font-size: 24px; margin: 16px 0 8px 0;">You're Invited to Evoltra!</h1>
              </div>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                ${inviterName ? `<strong>${inviterName}</strong> has` : "You have been"} invited you to join 
                <strong>${organizationName}</strong> as a <strong style="text-transform: capitalize;">${role}</strong>.
              </p>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                Evoltra is a powerful platform for freelancers and agencies to manage projects, tasks, and client communications all in one place.
              </p>
              
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #6366f1; font-size: 14px; word-break: break-all; background-color: #f4f4f5; padding: 12px; border-radius: 6px;">
                ${inviteLink}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
              
              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
                This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `You're invited to join ${organizationName} on Evoltra`,
      html: emailHtml,
    });

    if (result?.error) {
      console.error("Resend send failed:", result.error);
      throw new Error(typeof result.error === "string" ? result.error : "Failed to send invite email");
    }

    console.log("Email sent successfully:", result?.data?.id);

    return new Response(JSON.stringify({ success: true, messageId: result?.data?.id ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending invite email:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send email";

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
