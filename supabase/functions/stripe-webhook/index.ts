import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);
};

const resolveUserId = async (
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  customerId: string | null | undefined,
  fallbackEmail?: string | null,
  metadataUserId?: string | null,
) => {
  if (metadataUserId) {
    return metadataUserId;
  }

  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) {
      if (customer.metadata?.supabase_user_id) {
        return customer.metadata.supabase_user_id;
      }

      if (!fallbackEmail && customer.email) {
        fallbackEmail = customer.email;
      }
    }
  }

  if (!fallbackEmail) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", fallbackEmail)
    .maybeSingle();

  return profile?.user_id ?? null;
};

const syncProfileMode = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
  plan: "solo" | "team",
) => {
  const { error } = await supabase
    .from("profiles")
    .update({
      mode: plan,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
      return json(500, { error: "Stripe webhook environment is not configured" });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return json(400, { error: "Missing Stripe signature" });
    }

    const payload = await req.text();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const cryptoProvider = Stripe.createSubtleCryptoProvider();
    const event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret, undefined, cryptoProvider);
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    logStep("Received event", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = await resolveUserId(
          supabase,
          stripe,
          typeof session.customer === "string" ? session.customer : session.customer?.id,
          session.customer_details?.email ?? null,
          session.client_reference_id ?? session.metadata?.supabase_user_id ?? null,
        );

        if (userId && session.mode === "subscription") {
          await syncProfileMode(supabase, userId, "team");
          logStep("Profile upgraded from checkout", { userId, sessionId: session.id });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(
          supabase,
          stripe,
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
          null,
          subscription.metadata?.supabase_user_id ?? null,
        );

        if (userId) {
          const nextPlan = ACTIVE_STATUSES.has(subscription.status) ? "team" : "solo";
          await syncProfileMode(supabase, userId, nextPlan);
          logStep("Profile synced from subscription", {
            userId,
            subscriptionId: subscription.id,
            status: subscription.status,
            nextPlan,
          });
        }
        break;
      }

      default:
        logStep("Ignoring event", { type: event.type });
    }

    return json(200, { received: true });
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Error", error);
    return json(400, {
      error: error instanceof Error ? error.message : "Unknown webhook error",
    });
  }
});
