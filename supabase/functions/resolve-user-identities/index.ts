import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-id, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type RequestBody = {
  userIds?: string[];
  organizationId?: string | null;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json(500, { success: false, error: "Server not configured" });
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
    if (!token) {
      return json(401, { success: false, error: "Missing auth token" });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return json(401, { success: false, error: "Invalid auth token" });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const requestedIds = Array.from(new Set((body.userIds || []).filter(Boolean)));

    if (requestedIds.length === 0) {
      return json(200, { success: true, identities: {} });
    }

    if (body.organizationId) {
      const { data: membership } = await admin
        .from("organization_members")
        .select("id")
        .eq("organization_id", body.organizationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        return json(403, { success: false, error: "Access denied" });
      }
    }

    const { data: memberships, error: membershipError } = await admin
      .from("organization_members")
      .select("user_id")
      .in("user_id", requestedIds);

    if (membershipError) throw membershipError;

    const allowedIds = new Set((memberships || []).map((entry) => entry.user_id).filter(Boolean));
    const resolvedIds = requestedIds.filter((id) => allowedIds.has(id) || id === user.id);

    if (resolvedIds.length === 0) {
      return json(200, { success: true, identities: {} });
    }

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("user_id, full_name, email, avatar_url")
      .in("user_id", resolvedIds);

    if (profilesError) throw profilesError;

    const identities: Record<string, { full_name: string | null; email: string | null; avatar_url: string | null }> =
      Object.fromEntries(
        (profiles || []).map((profile) => [
          profile.user_id,
          {
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
          },
        ]),
      );

    const missingIds = resolvedIds.filter((id) => !identities[id]);

    for (const missingId of missingIds) {
      const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(missingId);

      if (authUserError || !authUserData?.user) {
        continue;
      }

      const authUser = authUserData.user;
      const email = authUser.email || null;
      const fullName =
        (typeof authUser.user_metadata?.full_name === "string" && authUser.user_metadata.full_name) ||
        (typeof authUser.user_metadata?.name === "string" && authUser.user_metadata.name) ||
        email;
      const avatarUrl =
        (typeof authUser.user_metadata?.avatar_url === "string" && authUser.user_metadata.avatar_url) || null;

      await admin.from("profiles").upsert(
        {
          user_id: missingId,
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
        },
        { onConflict: "user_id" },
      );

      identities[missingId] = {
        full_name: fullName,
        email,
        avatar_url: avatarUrl,
      };
    }

    return json(200, { success: true, identities });
  } catch (error) {
    return json(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
