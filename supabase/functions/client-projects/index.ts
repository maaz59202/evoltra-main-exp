import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, client-auth, x-user-id, x-client-id, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ProjectAction = "list" | "get";

const buildProjectProgress = (tasks: Array<{ status: string }>) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length;
  const todoTasks = tasks.filter((task) => task.status === "todo").length;
  const backlogTasks = tasks.filter((task) => task.status === "backlog").length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    todoTasks,
    backlogTasks,
    progressPercent,
  };
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
    const action: ProjectAction = body?.action === "get" ? "get" : "list";
    const projectId = typeof body?.projectId === "string" ? body.projectId : null;

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

    const { data: currentClient, error: clientError } = await supabase
      .from("client_users")
      .select("id, email")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError || !currentClient?.email) {
      return new Response(JSON.stringify({ success: false, error: "Client account not found" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: relatedClients, error: relatedClientsError } = await supabase
      .from("client_users")
      .select("id")
      .eq("email", currentClient.email.toLowerCase());

    if (relatedClientsError) throw relatedClientsError;

    const accessibleClientIds = Array.from(new Set((relatedClients || []).map((entry) => entry.id)));
    const { data: billingClients, error: billingClientsError } = await supabase
      .from("clients")
      .select("id")
      .eq("email", currentClient.email.toLowerCase());

    if (billingClientsError) throw billingClientsError;

    const accessibleBillingClientIds = Array.from(new Set((billingClients || []).map((entry) => entry.id)));

    if (action === "list") {
      const { data: projectLinks, error: linkError } = await supabase
        .from("project_clients")
        .select(`
          project_id,
          projects (
            id,
            name,
            status,
            created_at,
            organizations (
              id,
              name
            )
          )
        `)
        .in("client_user_id", accessibleClientIds)
        .eq("password_set", true);

      if (linkError) throw linkError;

      const projects = await Promise.all(
        (projectLinks || [])
          .map((link) => (Array.isArray(link.projects) ? link.projects[0] : link.projects))
          .filter(Boolean)
          .map(async (project) => {
            const [{ data: tasks }, { count: invoiceCount }] = await Promise.all([
              supabase.from("tasks").select("status").eq("project_id", project.id),
              accessibleBillingClientIds.length > 0
                ? supabase
                    .from("invoices")
                    .select("id", { count: "exact", head: true })
                    .eq("project_id", project.id)
                    .in("client_id", accessibleBillingClientIds)
                : Promise.resolve({ count: 0 }),
            ]);

            return {
              ...project,
              organization: Array.isArray(project.organizations)
                ? project.organizations[0] ?? null
                : project.organizations ?? null,
              progress: buildProjectProgress(tasks || []),
              invoiceCount: invoiceCount || 0,
            };
          }),
      );

      return new Response(JSON.stringify({ success: true, projects }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!projectId) {
      return new Response(JSON.stringify({ success: false, error: "Project id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: projectAccess, error: accessError } = await supabase
      .from("project_clients")
      .select("id")
      .eq("project_id", projectId)
      .in("client_user_id", accessibleClientIds)
      .eq("password_set", true)
      .maybeSingle();

    if (accessError) throw accessError;

    if (!projectAccess) {
      return new Response(JSON.stringify({ success: false, error: "You do not have access to this project" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: project }, { data: tasks }, { count: invoiceCount }] = await Promise.all([
      supabase
        .from("projects")
        .select(`
          id,
          name,
          status,
          created_at,
          organizations (
            id,
            name
          )
        `)
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select("id, title, status, priority, updated_at")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(12),
      accessibleBillingClientIds.length > 0
        ? supabase
            .from("invoices")
            .select("id", { count: "exact", head: true })
            .eq("project_id", projectId)
            .in("client_id", accessibleBillingClientIds)
        : Promise.resolve({ count: 0 }),
    ]);

    if (!project) {
      return new Response(JSON.stringify({ success: false, error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        project: {
          ...project,
          organization: Array.isArray(project.organizations)
            ? project.organizations[0] ?? null
            : project.organizations ?? null,
          progress: buildProjectProgress(tasks || []),
          recentTasks: tasks || [],
          invoiceCount: invoiceCount || 0,
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
