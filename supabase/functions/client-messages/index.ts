import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: RequestBody = await req.json();
    const clientId = req.headers.get("x-client-id");

    console.log("Client messages action:", body.action, "clientId:", clientId);

    if (!clientId) return json(401, { success: false, error: "Client not authenticated" });

    // Verify client has access to this project
    const { data: projectClient, error: accessError } = await supabase
      .from("project_clients")
      .select("*")
      .eq("client_user_id", clientId)
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
      return json(200, { success: true, messages });
    }

    // SEND MESSAGE
    if (body.action === "send") {
      const { projectId, message } = body as SendMessageRequest;

      if (!message.trim()) return json(400, { success: false, error: "Message cannot be empty" });

      // Get client info for the sender name
      const { data: clientUser } = await supabase
        .from("client_users")
        .select("full_name, email")
        .eq("id", clientId)
        .single();

      const { data: newMessage, error } = await supabase
        .from("project_messages")
        .insert({
          project_id: projectId,
          // sender_id is FK to users; client ids are from client_users.
          // Keep sender_id null for client-originated messages.
          sender_id: null,
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
            title: `New message from ${clientUser?.full_name || clientUser?.email || "client"}`,
            message: message.length > 100 ? message.substring(0, 100) + "..." : message,
            project_id: projectId,
          }));

          if (notifications.length > 0) {
            const { error: notificationError } = await supabase.from("notifications").insert(notifications);
            if (notificationError) {
              console.warn("Notification insert failed:", notificationError);
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
