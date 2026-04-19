import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptJsonValue, encryptJsonValue } from "../_shared/payment-encryption.ts";
import { parsePaymentReceivingDetailsCollection, toMaskedLegacyColumns } from "../_shared/payment-receiving.ts";

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
    const action = body?.action === "delete" ? "delete" : "save";
    const organizationId = typeof body?.organizationId === "string" ? body.organizationId : null;
    const paymentReceivingDetails = body?.paymentReceivingDetails ?? null;
    const paymentLink =
      typeof body?.paymentLink === "string" && body.paymentLink.trim().length > 0 ? body.paymentLink : null;

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

    let updatePayload: Record<string, unknown>;

    if (action === "delete") {
      updatePayload = {
        payment_receiving_details: null,
        payment_account_name: null,
        payment_account_number: null,
        payment_bank_name: null,
        payment_link: null,
      };
    } else {
      const parsedPaymentReceivingDetails = parsePaymentReceivingDetailsCollection(paymentReceivingDetails);
      if (!parsedPaymentReceivingDetails.length) {
        return json({ error: "Missing required payment receiving detail fields" }, 400);
      }

      const encryptedPaymentReceivingDetails = await encryptJsonValue({
        methods: parsedPaymentReceivingDetails,
      });
      const maskedLegacyColumns = toMaskedLegacyColumns(parsedPaymentReceivingDetails);

      updatePayload = {
        payment_receiving_details: encryptedPaymentReceivingDetails,
        payment_account_name: maskedLegacyColumns.payment_account_name,
        payment_account_number: maskedLegacyColumns.payment_account_number,
        payment_bank_name: maskedLegacyColumns.payment_bank_name,
        payment_link: paymentLink,
      };
    }

    const { data: updatedOrg, error: updateError } = await admin
      .from("organizations")
      .update(updatePayload)
      .eq("id", organizationId)
      .select(
        "id, payment_receiving_details, payment_account_name, payment_account_number, payment_bank_name, payment_link",
      )
      .maybeSingle();

    if (updateError) {
      return json({ error: updateError.message }, 500);
    }

    if (!updatedOrg) {
      return json({ error: "Organization not found" }, 404);
    }

    const decryptedPaymentDetails = await decryptJsonValue(updatedOrg.payment_receiving_details);

    return json({
      success: true,
      action,
      organization: {
        ...updatedOrg,
        payment_receiving_details: decryptedPaymentDetails,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
