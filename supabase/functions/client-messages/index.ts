import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GetMessagesRequest {
  action: "get";
  projectId: string;
}

interface SendMessageRequest {
  action: "send";
  projectId: string;
  message: string;
}

interface NotificationPreferences {
  emailNotifications?: boolean;
  clientMessages?: boolean;
}

type RequestBody = GetMessagesRequest | SendMessageRequest;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getErrorPayload = (error: unknown) => {
  if (error instanceof Error) {
    return { message: error.message, details: null, code: null };
  }
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; details?: unknown; code?: unknown; hint?: unknown };
    return {
      message: typeof e.message === "string" ? e.message : "Unknown error",
      details: e.details ?? e.hint ?? null,
      code: e.code ?? null,
    };
  }
  return { message: "Unknown error", details: null, code: null };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Evoltra <noreply@contact.evoltra.site>";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: RequestBody = await req.json();
    const clientId = req.headers.get("x-client-id");

    console.log("Client messages action:", body.action, "clientId:", clientId);

    if (!clientId) return json(401, { success: false, error: "Client not authenticated" });

    const { data: currentClient, error: currentClientError } = await supabase
      .from("client_users")
      .select("id, email, full_name")
      .eq("id", clientId)
      .maybeSingle();

    if (currentClientError || !currentClient?.email) {
      return json(401, { success: false, error: "Client account not found" });
    }

    const { data: relatedClients, error: relatedClientsError } = await supabase
      .from("client_users")
      .select("id")
      .eq("email", currentClient.email.toLowerCase());

    if (relatedClientsError) throw relatedClientsError;

    const accessibleClientIds = Array.from(new Set((relatedClients || []).map((entry) => entry.id)));

    // Verify client has access to this project
    const { data: projectClient, error: accessError } = await supabase
      .from("project_clients")
      .select("*")
      .in("client_user_id", accessibleClientIds)
      .eq("project_id", body.projectId)
      .eq("password_set", true)
      .single();

    if (accessError || !projectClient) return json(403, { success: false, error: "Access denied to this project" });

    // GET MESSAGES
    if (body.action === "get") {
      const { data: messages, error } = await supabase
        .from("project_messages")
        .select("*")
        .eq("project_id", body.projectId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const teamSenderIds = Array.from(
        new Set(
          (messages || [])
            .filter((message: { sender_type: string; sender_id: string | null }) => message.sender_type !== "client" && !!message.sender_id)
            .map((message: { sender_id: string | null }) => message.sender_id)
            .filter(Boolean),
        ),
      ) as string[];

      const clientSenderIds = Array.from(
        new Set(
          (messages || [])
            .filter((message: { sender_type: string; client_sender_id?: string | null; sender_id: string | null }) => message.sender_type === "client")
            .map((message: { client_sender_id?: string | null; sender_id: string | null }) => message.client_sender_id || message.sender_id)
            .filter(Boolean),
        ),
      ) as string[];

      const senderNames: Record<string, string> = {};

      if (teamSenderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", teamSenderIds);

        (profiles || []).forEach((profile: { user_id: string; full_name: string | null; email: string | null }) => {
          senderNames[profile.user_id] = profile.full_name || profile.email || "Team Member";
        });
      }

      if (clientSenderIds.length > 0) {
        const { data: clients } = await supabase
          .from("client_users")
          .select("id, full_name, email")
          .in("id", clientSenderIds);

        (clients || []).forEach((client: { id: string; full_name: string | null; email: string | null }) => {
          senderNames[client.id] = client.full_name || client.email || "Client";
        });
      }

      const enrichedMessages = (messages || []).map(
        (message: {
          sender_type: string;
          sender_id: string | null;
          sender_name?: string | null;
          client_sender_id?: string | null;
        }) => ({
          ...message,
          sender_name:
            message.sender_name ||
            (message.sender_type === "client"
              ? senderNames[message.client_sender_id || message.sender_id || ""]
              : senderNames[message.sender_id || ""]) ||
            (message.sender_type === "client" ? "Client" : "Team Member"),
        }),
      );

      return json(200, { success: true, messages: enrichedMessages });
    }

    // SEND MESSAGE
    if (body.action === "send") {
      const { projectId, message } = body as SendMessageRequest;

      if (!message.trim()) return json(400, { success: false, error: "Message cannot be empty" });

      // Get client info for the sender name
      const { data: newMessage, error } = await supabase
        .from("project_messages")
        .insert({
          project_id: projectId,
          sender_id: null,
          client_sender_id: clientId,
          sender_name: currentClient.full_name || currentClient.email || "Client",
          sender_type: "client",
          message: message.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Get project owner to send notification
      const { data: project } = await supabase
        .from("projects")
        .select("organization_id, name")
        .eq("id", projectId)
        .single();

      if (project) {
        // Get org members to notify
        const { data: orgMembers } = await supabase
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", project.organization_id);

        if (orgMembers && orgMembers.length > 0) {
          const notifications = orgMembers
            .filter((member: { user_id: string | null }) => !!member.user_id)
            .map((member: { user_id: string }) => ({
            user_id: member.user_id,
            type: "message",
            title: `New message from ${currentClient.full_name || currentClient.email || "client"}`,
            message: message.length > 100 ? message.substring(0, 100) + "..." : message,
            project_id: projectId,
          }));

          if (notifications.length > 0) {
            const { error: notificationError } = await supabase.from("notifications").insert(notifications);
            if (notificationError) {
              console.warn("Notification insert failed:", notificationError);
            }
          }

          if (resendApiKey) {
            const memberUserIds = orgMembers
              .map((member: { user_id: string | null }) => member.user_id)
              .filter(Boolean) as string[];

            if (memberUserIds.length > 0) {
              const { data: recipientProfiles, error: recipientError } = await supabase
                .from("profiles")
                .select("user_id, email, full_name, notification_preferences")
                .in("user_id", memberUserIds);

              if (recipientError) {
                console.warn("Failed to load client message email recipients:", recipientError);
              } else {
                const recipients = (recipientProfiles || []).filter(
                  (profile: {
                    email?: string | null;
                    notification_preferences?: NotificationPreferences | null;
                  }) => {
                    const prefs = profile.notification_preferences || {};
                    return !!profile.email && prefs.emailNotifications !== false && prefs.clientMessages !== false;
                  },
                );

                if (recipients.length > 0) {
                  const resend = new Resend(resendApiKey);
                  const previewText = message.length > 240 ? `${message.slice(0, 237)}...` : message;

                  const emailResults = await Promise.allSettled(
                    recipients.map((recipient: { email: string }) =>
                      resend.emails.send({
                        from: fromEmail,
                        to: recipient.email,
                        subject: `New client message in ${project.name}`,
                        html: `
                          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                            <h2 style="margin-bottom: 8px;">New client message</h2>
                            <p><strong>${currentClient.full_name || currentClient.email || "A client"}</strong> sent a new message in <strong>${project.name}</strong>.</p>
                            <div style="margin: 16px 0; padding: 16px; border-radius: 12px; background: #f3f4f6;">
                              ${previewText}
                            </div>
                            <p>Open Evoltra to reply and keep the conversation moving.</p>
                          </div>
                        `,
                      }),
                    ),
                  );

                  emailResults.forEach((result) => {
                    if (result.status === "rejected") {
                      console.warn("Client message email notification failed:", result.reason);
                    } else if (result.value?.error) {
                      console.warn("Client message email provider error:", result.value.error);
                    }
                  });
                }
              }
            }
          }
        }
      }

      return json(200, { success: true, message: newMessage });
    }

    return json(400, { success: false, error: "Invalid action" });
  } catch (error) {
    console.error("Client messages error:", error);
    const normalized = getErrorPayload(error);
    const status = normalized.message.toLowerCase().includes("denied") ? 403 : 500;
    return json(status, {
      success: false,
      error: normalized.message,
      errorDetails: normalized.details,
      errorCode: normalized.code,
    });
  }
});
