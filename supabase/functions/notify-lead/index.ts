import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadNotificationRequest {
  leadData: Record<string, string>;
  funnelId: string;
  funnelName: string;
  organizationId: string;
  sourceUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!gmailUser || !gmailPass) {
      console.log("Gmail SMTP not configured, skipping email");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { leadData, funnelId, funnelName, organizationId, sourceUrl }: LeadNotificationRequest = await req.json();

    console.log("Received notification request:", { funnelId, funnelName, organizationId });

    if (!leadData || !organizationId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: orgMembers, error: orgError } = await supabase
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .eq("role", "owner")
      .limit(1);

    if (orgError || !orgMembers || orgMembers.length === 0) {
      console.log("No owner found for organization:", orgError);
      return new Response(JSON.stringify({ error: "Organization owner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerId = orgMembers[0].user_id;
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(ownerId);
    
    if (userError || !userData?.user?.email) {
      console.log("Failed to get owner email:", userError);
      return new Response(JSON.stringify({ error: "Could not get owner email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerEmail = userData.user.email;
    console.log("Sending notification to:", ownerEmail);

    const leadDataHtml = Object.entries(leadData)
      .map(([key, value]) => `<tr><td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${key}</strong></td><td style="padding: 8px; border: 1px solid #e5e7eb;">${value}</td></tr>`)
      .join("");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });

    const info = await transporter.sendMail({
      from: `"Evoltra Leads" <${gmailUser}>`,
      to: ownerEmail,
      subject: `🎉 New Lead from ${funnelName || "your funnel"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1f2937; margin-bottom: 16px;">New Lead Captured!</h1>
          <p style="color: #6b7280; margin-bottom: 24px;">You've received a new lead from your funnel <strong>${funnelName || "Unknown Funnel"}</strong>.</p>
          
          <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 12px;">Lead Details</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Field</th>
                <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Value</th>
              </tr>
            </thead>
            <tbody>${leadDataHtml}</tbody>
          </table>
          
          ${sourceUrl ? `<p style="color: #6b7280;">Source: <a href="${sourceUrl}" style="color: #3b82f6;">${sourceUrl}</a></p>` : ""}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">This notification was sent automatically when a form was submitted on your funnel.</p>
        </div>
      `,
    });

    console.log("Email sent successfully:", info.messageId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-lead function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
