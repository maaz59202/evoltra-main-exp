import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

// Updated: 2026-02-08T14:15:00Z - v3 Force redeploy with full CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, client-auth, x-user-id, x-client-id, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

console.log("client-auth function loaded - v3");

console.log("client-auth function loaded - v2");

interface InviteClientRequest {
  action: "invite";
  email: string;
  fullName?: string;
  projectId: string;
  skipEmail?: boolean; // If true, just generate link without sending email
  invitedBy?: string | null;
}

interface SetPasswordRequest {
  action: "set-password";
  token: string;
  password: string;
}

interface LoginRequest {
  action: "login";
  email: string;
  password: string;
}

interface ValidateTokenRequest {
  action: "validate-token";
  token: string;
}

interface GetClientProjectsRequest {
  action: "get-projects";
  clientToken: string;
}

type RequestBody =
  | InviteClientRequest
  | SetPasswordRequest
  | LoginRequest
  | ValidateTokenRequest
  | GetClientProjectsRequest;

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getUserIdFromAuthHeader(req: Request): string | null {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice("Bearer ".length).trim();
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  console.log("Request received:", req.method, req.url);

  // Handle CORS preflight requests - MUST be first
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SITE_URL =
      Deno.env.get("PUBLIC_SITE_URL") ||
      Deno.env.get("SITE_URL") ||
      Deno.env.get("APP_URL") ||
      "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: RequestBody = await req.json();

    console.log("Action:", body.action);

    // INVITE CLIENT
    if (body.action === "invite") {
      const { email, fullName, projectId, skipEmail, invitedBy } = body as InviteClientRequest;
      console.log("Inviting client:", email, "to project:", projectId, "skipEmail:", skipEmail);
      const inviterId = invitedBy || getUserIdFromAuthHeader(req) || req.headers.get("x-user-id");

      if (!inviterId) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized: missing inviter identity" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get project details
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("name, organization_id")
        .eq("id", projectId)
        .single();

      if (projectError || !project) {
        console.error("Project not found:", projectError);
        return new Response(JSON.stringify({ success: false, error: "Project not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Found project:", project.name);

      // Check if client user exists or create one
      let clientUser;
      const { data: existingClients, error: existingError } = await supabase
        .from("client_users")
        .select("*")
        .eq("email", email.toLowerCase())
        .limit(1);

      if (existingError) {
        console.error("Error checking existing client:", existingError);
        throw existingError;
      }

      const existingClient = existingClients?.[0];

      if (existingClient) {
        clientUser = existingClient;
        console.log("Existing client found:", clientUser.id);
      } else {
        const { data: newClient, error: createError } = await supabase
          .from("client_users")
          .insert({
            email: email.toLowerCase(),
            full_name: fullName || null,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating client:", createError);
          throw createError;
        }
        clientUser = newClient;
        console.log("New client created:", clientUser.id);
      }

      if (project.organization_id) {
        const normalizedEmail = email.toLowerCase();
        const { data: orgBillingClients, error: billingClientLookupError } = await supabase
          .from("clients")
          .select("id")
          .eq("organization_id", project.organization_id)
          .eq("email", normalizedEmail)
          .limit(1);

        if (billingClientLookupError) {
          console.error("Error checking billing client:", billingClientLookupError);
          throw billingClientLookupError;
        }

        if (!orgBillingClients || orgBillingClients.length === 0) {
          const { error: billingClientCreateError } = await supabase
            .from("clients")
            .insert({
              organization_id: project.organization_id,
              name: fullName || clientUser.full_name || normalizedEmail.split("@")[0],
              email: normalizedEmail,
            });

          if (billingClientCreateError) {
            console.error("Error creating billing client:", billingClientCreateError);
            throw billingClientCreateError;
          }
        }
      }

      // Create project_client link with invite token
      const { data: projectClient, error: linkError } = await supabase
        .from("project_clients")
        .insert({
          project_id: projectId,
          client_user_id: clientUser.id,
          invited_by: inviterId,
          password_set: !!existingClient?.password_hash,
        })
        .select()
        .single();

      if (linkError) {
        if (linkError.code === "23505") {
          return new Response(JSON.stringify({ success: false, error: "Client already invited to this project" }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("Error linking client to project:", linkError);
        throw linkError;
      }

      console.log("Project client link created:", projectClient.id);

      // Build invite link
      const origin = req.headers.get("origin") || SITE_URL || "https://evoltra-suite.com";
      const inviteLink = `${origin}/client/accept/${projectClient.invite_token}`;
      console.log("Invite link:", inviteLink);

      // Send invitation email only if not skipped
      let emailSent = false;
      let emailDeliveryError: string | null = null;
      if (!skipEmail && RESEND_API_KEY) {
        try {
          console.log("Sending email via Resend...");
          const resend = new Resend(RESEND_API_KEY);
          const emailResult = await resend.emails.send({
            from: "Evoltra <noreply@contact.evoltra.site>",
            to: [email.toLowerCase()],
            subject: `You've been invited to view ${project.name} on Evoltra`,
            html: `
              <!DOCTYPE html>
              <html>
                <body style="font-family: sans-serif; padding: 40px; background: #f4f4f5;">
                  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px;">
                    <h1 style="color: #18181b;">You're invited to view a project!</h1>
                    <p style="color: #52525b; line-height: 1.6;">
                      You've been invited to view <strong>${project.name}</strong> on Evoltra.
                    </p>
                    <p style="color: #52525b; line-height: 1.6;">
                      Click the button below to ${existingClient?.password_hash ? "access" : "set up your password and access"} the project.
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${inviteLink}" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                        View Project
                      </a>
                    </div>
                    <p style="color: #71717a; font-size: 12px;">
                      This link expires in 7 days.
                    </p>
                  </div>
                </body>
              </html>
            `,
          });
          if (emailResult?.error) {
            emailDeliveryError = typeof emailResult.error === "string"
              ? emailResult.error
              : JSON.stringify(emailResult.error);
            console.error("Email failed:", emailResult.error);
          } else {
            emailSent = true;
            console.log("Email sent successfully:", emailResult);
          }
        } catch (err) {
          emailDeliveryError = err instanceof Error ? err.message : "Failed to send email";
          console.error("Failed to send email:", err);
        }
      } else if (skipEmail) {
        console.log("Skipping email (link-only mode)");
      } else {
        console.log("No RESEND_API_KEY configured, skipping email");
        emailDeliveryError = "Email service is not configured";
      }

      return new Response(JSON.stringify({ success: true, inviteLink, emailSent, emailError: emailDeliveryError }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // VALIDATE TOKEN
    if (body.action === "validate-token") {
      const { token } = body as ValidateTokenRequest;

      const { data: projectClient, error } = await supabase
        .from("project_clients")
        .select(
          `
          *,
          client_users (*),
          projects (name)
        `,
        )
        .eq("invite_token", token)
        .single();

      if (error || !projectClient) {
        return new Response(JSON.stringify({ valid: false, error: "Invalid or expired token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(projectClient.invite_expires_at) < new Date()) {
        return new Response(JSON.stringify({ valid: false, error: "Token has expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          valid: true,
          needsPassword: !projectClient.password_set,
          email: projectClient.client_users.email,
          projectName: projectClient.projects.name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // SET PASSWORD
    if (body.action === "set-password") {
      const { token, password } = body as SetPasswordRequest;

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      const { data: projectClient, error: findError } = await supabase
        .from("project_clients")
        .select("*, client_users (*)")
        .eq("invite_token", token)
        .single();

      if (findError || !projectClient) {
        throw new Error("Invalid token");
      }

      const hashedPassword = await hashPassword(password);

      // Update client user password
      await supabase
        .from("client_users")
        .update({ password_hash: hashedPassword })
        .eq("id", projectClient.client_user_id);

      // Mark password as set and update all project_clients for this user
      await supabase
        .from("project_clients")
        .update({ password_set: true })
        .eq("client_user_id", projectClient.client_user_id);

      // Generate a session token
      const sessionToken = crypto.randomUUID();

      return new Response(
        JSON.stringify({ success: true, clientToken: sessionToken, clientId: projectClient.client_user_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // LOGIN
    if (body.action === "login") {
      const { email, password } = body as LoginRequest;

      const { data: clientUsers, error } = await supabase
        .from("client_users")
        .select("*")
        .eq("email", email.toLowerCase())
        .order("created_at", { ascending: false });

      if (error || !clientUsers || clientUsers.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "Invalid email or password" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hashedPassword = await hashPassword(password);
      const candidates = clientUsers.filter((u: { password_hash?: string | null }) => !!u.password_hash);

      if (candidates.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "Password not set. Use your invite link to create one." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const clientUser = candidates.find((u: { password_hash?: string | null }) => u.password_hash === hashedPassword);
      if (!clientUser) {
        return new Response(JSON.stringify({ success: false, error: "Invalid email or password" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sessionToken = crypto.randomUUID();

      return new Response(
        JSON.stringify({
          success: true,
          clientToken: sessionToken,
          clientId: clientUser.id,
          email: clientUser.email,
          fullName: clientUser.full_name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // GET CLIENT PROJECTS
    if (body.action === "get-projects") {
      const clientId = req.headers.get("x-client-id");

      if (!clientId) {
        throw new Error("Not authenticated");
      }

      const { data: projectClients, error } = await supabase
        .from("project_clients")
        .select(
          `
          *,
          projects (*)
        `,
        )
        .eq("client_user_id", clientId)
        .eq("password_set", true);

      if (error) throw error;

      const projects = projectClients?.map((pc: { projects: Record<string, unknown> }) => pc.projects) || [];

      return new Response(JSON.stringify({ success: true, projects }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    console.error("Client auth error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const status = errorMessage.toLowerCase().includes("unauthorized") ? 401 : 500;

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
