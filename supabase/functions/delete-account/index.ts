import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authedClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authError } = await authedClient.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const confirmEmail = String(body?.confirmEmail || "").trim().toLowerCase();
    const userEmail = (authData.user.email || "").trim().toLowerCase();

    if (!confirmEmail || confirmEmail !== userEmail) {
      return new Response(JSON.stringify({ error: "Please confirm your account email to continue" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ownerMemberships, error: ownerMembershipsError } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", authData.user.id)
      .eq("role", "owner");

    if (ownerMembershipsError) {
      return new Response(JSON.stringify({ error: ownerMembershipsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownedOrganizationIds = (ownerMemberships || [])
      .map((membership) => membership.organization_id)
      .filter((organizationId): organizationId is string => !!organizationId);

    if (ownedOrganizationIds.length > 0) {
      const { data: ownedOrganizations } = await admin
        .from("organizations")
        .select("id, name")
        .in("id", ownedOrganizationIds);

      const organizationNames = (ownedOrganizations || []).map((organization) => organization.name);
      return new Response(
        JSON.stringify({
          error:
            organizationNames.length > 0
              ? `Transfer or delete these workspaces first: ${organizationNames.join(", ")}`
              : "Transfer or delete your owned workspaces before deleting this account",
          code: "OWNED_ORGANIZATIONS_EXIST",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cleanupSteps = [
      admin.from("notifications").delete().eq("user_id", authData.user.id),
      admin.from("tasks").update({ assignee_id: null }).eq("assignee_id", authData.user.id),
      admin.from("team_invites").update({ invited_by: null }).eq("invited_by", authData.user.id),
      admin.from("project_messages").update({ sender_id: null }).eq("sender_id", authData.user.id),
      admin.from("organization_members").delete().eq("user_id", authData.user.id),
      admin.from("profiles").delete().eq("user_id", authData.user.id),
    ];

    const cleanupResults = await Promise.all(cleanupSteps);
    const cleanupError = cleanupResults.find((result) => result.error)?.error;
    if (cleanupError) {
      return new Response(JSON.stringify({ error: cleanupError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: avatarFiles, error: avatarListError } = await admin.storage
      .from("avatars")
      .list(authData.user.id, { limit: 100 });

    if (!avatarListError && avatarFiles && avatarFiles.length > 0) {
      const avatarPaths = avatarFiles.map((file) => `${authData.user.id}/${file.name}`);
      await admin.storage.from("avatars").remove(avatarPaths);
    }

    const { error: deleteAuthUserError } = await admin.auth.admin.deleteUser(authData.user.id);
    if (deleteAuthUserError) {
      return new Response(JSON.stringify({ error: deleteAuthUserError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
