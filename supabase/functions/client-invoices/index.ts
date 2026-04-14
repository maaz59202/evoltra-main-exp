import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { decryptJsonValue } from "../_shared/payment-encryption.ts";
import { parsePaymentReceivingDetails } from "../_shared/payment-receiving.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, client-auth, x-user-id, x-client-id, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const clientId = req.headers.get("x-client-id");
    if (!clientId) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const action = body?.action === "list" ? "list" : "get";
    const invoiceId = typeof body?.invoiceId === "string" ? body.invoiceId : null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ success: false, error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: clientUser, error: clientUserError } = await supabase
      .from("client_users")
      .select("id, email, full_name")
      .eq("id", clientId)
      .maybeSingle();

    if (clientUserError || !clientUser) {
      return new Response(JSON.stringify({ success: false, error: "Client account not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: relatedClients, error: relatedClientsError } = await supabase
      .from("client_users")
      .select("id")
      .eq("email", clientUser.email.toLowerCase());

    if (relatedClientsError) {
      throw relatedClientsError;
    }

    const accessibleClientIds = Array.from(new Set((relatedClients || []).map((entry) => entry.id)));

    if (action === "list") {
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          status,
          total,
          due_date,
          created_at,
          currency,
          client_id,
          project_id
        `)
        .order("created_at", { ascending: false });

      if (invoicesError) {
        throw invoicesError;
      }

      const projectIds = Array.from(new Set((invoices || []).map((invoice) => invoice.project_id).filter(Boolean)));
      const clientIds = Array.from(new Set((invoices || []).map((invoice) => invoice.client_id).filter(Boolean)));

      const [{ data: projectAccess }, { data: invoiceClients }, { data: projects }] = await Promise.all([
        projectIds.length > 0
          ? supabase
              .from("project_clients")
              .select("project_id")
              .in("client_user_id", accessibleClientIds)
              .eq("password_set", true)
              .in("project_id", projectIds as string[])
          : Promise.resolve({ data: [] }),
        clientIds.length > 0
          ? supabase.from("clients").select("id, name, email").in("id", clientIds as string[])
          : Promise.resolve({ data: [] }),
        projectIds.length > 0
          ? supabase.from("projects").select("id, name").in("id", projectIds as string[])
          : Promise.resolve({ data: [] }),
      ]);

      const allowedProjectIds = new Set((projectAccess || []).map((row) => row.project_id));
      const clientMap = Object.fromEntries((invoiceClients || []).map((entry) => [entry.id, entry]));
      const projectMap = Object.fromEntries((projects || []).map((entry) => [entry.id, entry]));

      const filteredInvoices = (invoices || [])
        .filter((invoice) => {
          const clientRecord = invoice.client_id ? clientMap[invoice.client_id] : null;
          const emailMatches = !!clientRecord?.email && clientRecord.email.toLowerCase() === clientUser.email.toLowerCase();

          if (invoice.project_id) {
            return allowedProjectIds.has(invoice.project_id);
          }

          return emailMatches;
        })
        .map((invoice) => ({
          ...invoice,
          client: invoice.client_id ? clientMap[invoice.client_id] || null : null,
          project: invoice.project_id ? projectMap[invoice.project_id] || null : null,
        }));

      return new Response(JSON.stringify({ success: true, invoices: filteredInvoices }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!invoiceId) {
      return new Response(JSON.stringify({ success: false, error: "Invoice id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        status,
        subtotal,
        tax_rate,
        total,
        due_date,
        notes,
        created_at,
        paid_at,
        client_id,
        project_id,
        organization_id,
        currency
      `)
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ success: false, error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: invoiceClient }, { data: projectMembership }, { data: organization }, { data: items }, { data: project }] =
      await Promise.all([
        invoice.client_id
          ? supabase.from("clients").select("id, name, email").eq("id", invoice.client_id).maybeSingle()
          : Promise.resolve({ data: null }),
        invoice.project_id
          ? supabase
              .from("project_clients")
              .select("id")
              .eq("project_id", invoice.project_id)
              .in("client_user_id", accessibleClientIds)
              .eq("password_set", true)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("organizations")
          .select("id, name, payment_receiving_details, payment_link")
          .eq("id", invoice.organization_id)
          .maybeSingle(),
        supabase
          .from("invoice_items")
          .select("id, description, quantity, unit_price, amount")
          .eq("invoice_id", invoice.id)
          .order("id", { ascending: true }),
        invoice.project_id
          ? supabase.from("projects").select("id, name").eq("id", invoice.project_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    const emailMatchesClient = !!invoiceClient?.email && invoiceClient.email.toLowerCase() === clientUser.email.toLowerCase();
    const canAccessInvoice = invoice.project_id ? !!projectMembership : emailMatchesClient;

    if (!canAccessInvoice) {
      return new Response(JSON.stringify({ success: false, error: "You do not have access to this invoice" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const decryptedPaymentDetails = await decryptJsonValue(organization?.payment_receiving_details);
    const paymentReceivingDetails = parsePaymentReceivingDetails(decryptedPaymentDetails);

    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          ...invoice,
          client: invoiceClient || null,
          client_user: {
            id: clientUser.id,
            email: clientUser.email,
            full_name: clientUser.full_name,
          },
          project: project || null,
          organization: organization
            ? {
                id: organization.id,
                name: organization.name,
                payment_receiving_details: paymentReceivingDetails,
                payment_link: organization.payment_link,
              }
            : null,
          items: items || [],
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
