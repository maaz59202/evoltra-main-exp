import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ActivityRequest =
  | {
      type: "project_update";
      projectId: string;
      message: string;
      senderName?: string | null;
    }
  | {
      type: "invoice_paid";
      invoiceId: string;
      senderName?: string | null;
    };

type NotificationPreferences = {
  emailNotifications?: boolean;
  projectUpdates?: boolean;
  clientMessages?: boolean;
  teamActivity?: boolean;
  invoiceReminders?: boolean;
  marketingEmails?: boolean;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { success: false, error: "Unauthorized" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Evoltra <noreply@contact.evoltra.site>";

    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, { success: false, error: "Supabase environment is not configured" });
    }

    if (!resendApiKey) {
      return json(500, { success: false, error: "Resend is not configured" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return json(401, { success: false, error: "Invalid token" });
    }

    const body = (await req.json()) as ActivityRequest;
    const resend = new Resend(resendApiKey);

    if (body.type === "project_update") {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, name, organization_id")
        .eq("id", body.projectId)
        .single();

      if (projectError || !project) {
        return json(404, { success: false, error: "Project not found" });
      }

      const { data: membership } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", project.organization_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        return json(403, { success: false, error: "Forbidden" });
      }

      const { data: clients, error: clientError } = await supabase
        .from("project_clients")
        .select("client_users(email, full_name)")
        .eq("project_id", body.projectId)
        .eq("password_set", true);

      if (clientError) {
        return json(500, { success: false, error: "Failed to load project clients" });
      }

      const recipients = (clients || [])
        .map((entry: { client_users?: { email?: string | null; full_name?: string | null } | null }) => entry.client_users)
        .filter((recipient): recipient is { email: string; full_name?: string | null } => !!recipient?.email);

      if (recipients.length === 0) {
        return json(200, { success: true, sent: 0 });
      }

      const senderName = body.senderName || user.user_metadata?.full_name || user.email || "Your team";

      await Promise.all(
        recipients.map((recipient) =>
          resend.emails.send({
            from: fromEmail,
            to: recipient.email,
            subject: `Project update from ${project.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                <h2 style="margin-bottom: 8px;">Project update</h2>
                <p><strong>${senderName}</strong> sent a new update in <strong>${project.name}</strong>.</p>
                <div style="margin: 16px 0; padding: 16px; border-radius: 12px; background: #f3f4f6;">
                  ${body.message}
                </div>
                <p>Sign in to your client portal to reply.</p>
              </div>
            `,
          }),
        ),
      );

      return json(200, { success: true, sent: recipients.length });
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, invoice_number, total, currency, organization_id, client:clients(name)")
      .eq("id", body.invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return json(404, { success: false, error: "Invoice not found" });
    }

    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", invoice.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return json(403, { success: false, error: "Forbidden" });
    }

    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("user_id, profiles!inner(email, full_name, notification_preferences)")
      .eq("organization_id", invoice.organization_id);

    if (membersError) {
      return json(500, { success: false, error: "Failed to load notification recipients" });
    }

    const recipients = (members || [])
      .map(
        (entry: {
          profiles?: {
            email?: string | null;
            full_name?: string | null;
            notification_preferences?: NotificationPreferences | null;
          } | null;
        }) => entry.profiles,
      )
      .filter((profile): profile is { email: string; full_name?: string | null; notification_preferences?: NotificationPreferences | null } => {
        const prefs = profile?.notification_preferences || {};
        return !!profile?.email && prefs.emailNotifications !== false && prefs.invoiceReminders !== false;
      });

    if (recipients.length === 0) {
      return json(200, { success: true, sent: 0 });
    }

    const senderName = body.senderName || user.user_metadata?.full_name || user.email || "A team member";
    const amountLabel = `${invoice.currency || "USD"} ${Number(invoice.total).toFixed(2)}`;

    await Promise.all(
      recipients.map((recipient) =>
        resend.emails.send({
          from: fromEmail,
          to: recipient.email,
          subject: `Invoice ${invoice.invoice_number} marked as paid`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
              <h2 style="margin-bottom: 8px;">Invoice payment update</h2>
              <p><strong>${senderName}</strong> marked invoice <strong>${invoice.invoice_number}</strong> as paid.</p>
              <p>Client: <strong>${invoice.client?.name || "Unknown client"}</strong></p>
              <p>Amount: <strong>${amountLabel}</strong></p>
            </div>
          `,
        }),
      ),
    );

    return json(200, { success: true, sent: recipients.length });
  } catch (error) {
    console.error("send-activity-email error:", error);
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
