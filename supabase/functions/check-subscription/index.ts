const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ subscribed: false, plan: "solo", product_id: null, subscription_end: null, error: "stripe_not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract email from JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    let userEmail = "";
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        // Base64url decode
        let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        while (b64.length % 4) b64 += "=";
        const decoded = atob(b64);
        const payload = JSON.parse(decoded);
        userEmail = String(payload.email ?? "");
      }
    } catch (_e) {
      // ignore decode errors
    }

    if (!userEmail) {
      return new Response(
        JSON.stringify({ subscribed: false, plan: "solo", product_id: null, subscription_end: null, error: "no_email" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find Stripe customer
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(userEmail)}&limit=1`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const custText = await custRes.text();
    let custData: any;
    try { custData = JSON.parse(custText); } catch { custData = {}; }

    if (!custData?.data?.length) {
      return new Response(
        JSON.stringify({ subscribed: false, plan: "solo", product_id: null, subscription_end: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = custData.data[0].id;

    // List active subscriptions
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=active&limit=1`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const subText = await subRes.text();
    let subData: any;
    try { subData = JSON.parse(subText); } catch { subData = {}; }

    if (!subData?.data?.length) {
      return new Response(
        JSON.stringify({ subscribed: false, plan: "solo", product_id: null, subscription_end: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sub = subData.data[0];

    // Safely get subscription end - avoid any Date usage that could throw
    let subscriptionEnd: string | null = null;
    const pe = sub.current_period_end;
    if (typeof pe === "number" && Number.isFinite(pe) && pe > 0) {
      try {
        const d = new Date(pe * 1000);
        if (Number.isFinite(d.getTime())) {
          subscriptionEnd = d.toISOString();
        }
      } catch {
        subscriptionEnd = null;
      }
    }

    // Safely get product ID
    let productId: string | null = null;
    try {
      const items = sub.items?.data;
      if (Array.isArray(items) && items.length > 0) {
        const p = items[0]?.plan?.product ?? items[0]?.price?.product;
        if (typeof p === "string") productId = p;
      }
    } catch {
      productId = null;
    }

    return new Response(
      JSON.stringify({
        subscribed: true,
        plan: "team",
        product_id: productId,
        subscription_end: subscriptionEnd,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ subscribed: false, plan: "solo", product_id: null, subscription_end: null, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
