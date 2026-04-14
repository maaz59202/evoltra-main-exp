import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { decryptJsonValue } from "../_shared/payment-encryption.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing or invalid authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Server not configured" }, 500);
    }

    const authedClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await authedClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : null;

    if (!organizationId) {
      return json({ error: "Missing organization id" }, 400);
    }

    const { data: membership, error: membershipError } = await admin
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      return json({ error: membershipError.message }, 500);
    }

    if (!membership || !["owner", "admin"].includes(membership.role || "")) {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: organization, error: orgError } = await admin
      .from("organizations")
      .select(
        "id, payment_receiving_details, payment_account_name, payment_account_number, payment_bank_name, payment_link",
      )
      .eq("id", organizationId)
      .maybeSingle();

    if (orgError) {
      return json({ error: orgError.message }, 500);
    }

    if (!organization) {
      return json({ error: "Organization not found" }, 404);
    }

    const decryptedPaymentDetails = await decryptJsonValue(organization.payment_receiving_details);

    return json({
      success: true,
      organization: {
        ...organization,
        payment_receiving_details: decryptedPaymentDetails,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
