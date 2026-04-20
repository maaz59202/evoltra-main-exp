import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DesignComponentInput {
  id?: string;
  funnel_id: string;
  organization_id: string;
  component_type: string;
  component_name: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  z_index?: number;
  shadow_blur?: number;
  shadow_spread?: number;
  shadow_offset_x?: number;
  shadow_offset_y?: number;
  shadow_opacity?: number;
  shadow_color?: string;
  opacity?: number;
  text_bold?: boolean;
  text_italic?: boolean;
  text_underline?: boolean;
  text_color?: string;
  font_size?: number;
  font_family?: string;
  text_align?: string;
  animation_type?: string;
  animation_duration?: number;
  animation_delay?: number;
  animation_timing_function?: string;
  visibility_conditions?: Record<string, any>[];
  parent_component_id?: string;
}

interface BatchUpdatePayload {
  funnel_id: string;
  components: DesignComponentInput[];
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          authorization: req.headers.get("authorization") || "",
        },
      },
    });

    // Get the user from the authorization header
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { method } = req;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // POST: Save single component or batch update
    if (method === "POST") {
      const payload: DesignComponentInput | BatchUpdatePayload = await req.json();

      // Check if it's a batch update
      if ("components" in payload && Array.isArray(payload.components)) {
        const batchPayload = payload as BatchUpdatePayload;
        const { data, error } = await supabase.rpc(
          "batch_update_design_components",
          {
            p_funnel_id: batchPayload.funnel_id,
            p_components: JSON.stringify(batchPayload.components),
          }
        );

        if (error) {
          throw error;
        }

        return new Response(JSON.stringify({ success: true, data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Single component save
      const componentInput = payload as DesignComponentInput;

      if (!componentInput.funnel_id || !componentInput.organization_id) {
        return new Response(
          JSON.stringify({ error: "Missing funnel_id or organization_id" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const componentData = {
        ...componentInput,
        created_by: user.id,
        updated_by: user.id,
      };

      let response;
      if (componentInput.id) {
        // Update existing component
        response = await supabase
          .from("design_components")
          .update(componentData)
          .eq("id", componentInput.id)
          .select();
      } else {
        // Insert new component
        response = await supabase
          .from("design_components")
          .insert([componentData])
          .select();
      }

      if (response.error) {
        throw response.error;
      }

      return new Response(JSON.stringify({ success: true, data: response.data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET: Retrieve components for a funnel
    if (method === "GET") {
      const funnel_id = url.searchParams.get("funnel_id");

      if (!funnel_id) {
        return new Response(
          JSON.stringify({ error: "Missing funnel_id parameter" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data, error } = await supabase.rpc(
        "get_design_components_by_funnel",
        {
          p_funnel_id: funnel_id,
        }
      );

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE: Remove a component
    if (method === "DELETE") {
      const component_id = url.searchParams.get("component_id");

      if (!component_id) {
        return new Response(
          JSON.stringify({ error: "Missing component_id parameter" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const response = await supabase
        .from("design_components")
        .delete()
        .eq("id", component_id);

      if (response.error) {
        throw response.error;
      }

      return new Response(
        JSON.stringify({ success: true, message: "Component deleted" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
