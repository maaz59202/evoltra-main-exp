import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return json({ subscribed: false, plan: "solo", product_id: null, subscription_end: null, error: "stripe_not_configured" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ subscribed: false, plan: "solo", product_id: null, subscription_end: null, error: "unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user?.email) {
      return json({ subscribed: false, plan: "solo", product_id: null, subscription_end: null, error: "no_email" }, 401);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });

    const prioritizedCustomers = customers.data.sort((left, right) => {
      const leftMatch = left.metadata?.supabase_user_id === user.id ? 1 : 0;
      const rightMatch = right.metadata?.supabase_user_id === user.id ? 1 : 0;
      return rightMatch - leftMatch;
    });

    if (prioritizedCustomers.length === 0) {
      return json({ subscribed: false, plan: "solo", product_id: null, subscription_end: null });
    }

    for (const customer of prioritizedCustomers) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 20,
        status: "all",
      });

      const activeSubscription = subscriptions.data.find((subscription) =>
        ["active", "trialing", "past_due", "unpaid"].includes(subscription.status),
      );

      if (!activeSubscription) {
        continue;
      }

      const currentPeriodEnd =
        activeSubscription.items.data[0]?.current_period_end || activeSubscription.current_period_end || null;
      const subscriptionEnd =
        typeof currentPeriodEnd === "number" ? new Date(currentPeriodEnd * 1000).toISOString() : null;
      const productId =
        activeSubscription.items.data[0]?.price?.product && typeof activeSubscription.items.data[0]?.price?.product === "string"
          ? activeSubscription.items.data[0].price.product
          : null;

      return json({
        subscribed: true,
        plan: "team",
        product_id: productId,
        subscription_end: subscriptionEnd,
        cancel_at_period_end: activeSubscription.cancel_at_period_end ?? false,
        customer_id: customer.id,
        subscription_status: activeSubscription.status,
      });
    }

    return json({ subscribed: false, plan: "solo", product_id: null, subscription_end: null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ subscribed: false, plan: "solo", product_id: null, subscription_end: null, error: msg });
  }
});
