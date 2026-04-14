import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { decryptJsonValue } from "../_shared/payment-encryption.ts";
import { parsePaymentReceivingDetails } from "../_shared/payment-receiving.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface InvoiceReminderRequest {
  invoiceId: string;
  reminderType: "initial" | "reminder" | "overdue";
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  PKR: "Rs",
  EUR: "€",
  GBP: "£",
  AED: "AED",
};

const formatInvoiceAmount = (amount: number, currency?: string | null) => {
  const normalizedCurrency = (currency || "USD").toUpperCase();
  const symbol = currencySymbols[normalizedCurrency] || normalizedCurrency;
  return `${symbol}${Number(amount).toFixed(2)}`;
};

const getUserIdFromAuthHeader = (authHeader: string | null) => {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload));
    return typeof decoded.sub === "string" ? decoded.sub : null;
  } catch (error) {
    console.error("Failed to decode auth header:", error);
    return null;
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserIdFromAuthHeader(req.headers.get("Authorization"));
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Evoltra Billing <noreply@contact.evoltra.site>";
    if (!resendApiKey) {
      console.log("Resend is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invoiceId, reminderType }: InvoiceReminderRequest = await req.json();

    console.log(`Processing ${reminderType} reminder for invoice: ${invoiceId}`);

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        *,
        client:clients(id, name, email),
        organization:organizations(name, payment_receiving_details, payment_account_name, payment_account_number, payment_bank_name, payment_link)
      `)
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice not found:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", invoice.organization_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError || !membership) {
      console.error("Unauthorized invoice reminder attempt:", membershipError);
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!invoice.client?.email) {
      console.log("No client email found for invoice");
      return new Response(
        JSON.stringify({ error: "Client email not found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const decryptedPaymentDetails = await decryptJsonValue(invoice.organization?.payment_receiving_details);
    const paymentReceivingDetails = parsePaymentReceivingDetails(decryptedPaymentDetails);

    if (!paymentReceivingDetails) {
      return new Response(
        JSON.stringify({
          error: "Payment receiving details are incomplete. Add a valid payment method in Billing before sending invoice emails.",
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const subjects = {
      initial: `Invoice ${invoice.invoice_number} from ${invoice.organization?.name || "Evoltra"}`,
      reminder: `Reminder: Invoice ${invoice.invoice_number} - Payment Due`,
      overdue: `OVERDUE: Invoice ${invoice.invoice_number} - Immediate Payment Required`,
    };

    const dueDate = invoice.due_date 
      ? new Date(invoice.due_date).toLocaleDateString("en-US", { 
          year: "numeric", month: "long", day: "numeric" 
        })
      : "No due date specified";
    const formattedTotal = formatInvoiceAmount(Number(invoice.total), invoice.currency);
    const origin =
      req.headers.get("origin") ||
      Deno.env.get("PUBLIC_SITE_URL") ||
      Deno.env.get("SITE_URL") ||
      Deno.env.get("APP_URL") ||
      "https://evoltra.site";
    const invoiceUrl = `${origin.replace(/\/$/, "")}/client/invoice/${invoice.id}`;
    const invoiceCallToAction = `
      <div style="margin: 28px 0;">
        <a href="${invoiceUrl}" style="display: inline-block; background: #7c5cff; color: white; padding: 14px 22px; border-radius: 10px; text-decoration: none; font-weight: 600;">
          View Invoice
        </a>
      </div>
      <p style="margin: 12px 0 0; color: #52525b;">
        Payment details are available securely inside your client portal invoice view.
      </p>
    `;

    const emailContent = {
      initial: `
        <h1>Invoice ${invoice.invoice_number}</h1>
        <p>Dear ${invoice.client.name},</p>
        <p>Please find your invoice from ${invoice.organization?.name || "Evoltra"} below:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
          <p><strong>Amount Due:</strong> ${formattedTotal}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
        </div>
        ${invoiceCallToAction}
        ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ""}
        <p>Thank you for trusting ${invoice.organization?.name || "Evoltra"}</p>
      `,
      reminder: `
        <h1>Payment Reminder</h1>
        <p>Dear ${invoice.client.name},</p>
        <p>This is a friendly reminder that payment for the following invoice is due:</p>
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
          <p><strong>Amount Due:</strong> ${formattedTotal}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
        </div>
        ${invoiceCallToAction}
        <p>Please arrange for payment at your earliest convenience.</p>
        <p>If you have already made this payment, please disregard this reminder.</p>
      `,
      overdue: `
        <h1 style="color: #dc3545;">Payment Overdue</h1>
        <p>Dear ${invoice.client.name},</p>
        <p>Our records indicate that the following invoice is now overdue:</p>
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
          <p><strong>Amount Due:</strong> ${formattedTotal}</p>
          <p><strong>Original Due Date:</strong> ${dueDate}</p>
        </div>
        ${invoiceCallToAction}
        <p>Please arrange for immediate payment to avoid any service interruptions.</p>
        <p>If you have any questions or concerns, please contact us immediately.</p>
      `,
    };

    const resend = new Resend(resendApiKey);
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: invoice.client.email,
      subject: subjects[reminderType],
      html: emailContent[reminderType],
    });

    if (emailResult?.error) {
      console.error("Resend send failed:", emailResult.error);
      return new Response(
        JSON.stringify({
          error: typeof emailResult.error === "string" ? emailResult.error : "Failed to send email",
          providerError: emailResult.error,
        }),
        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", emailResult?.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${reminderType} email sent successfully`,
        emailId: emailResult?.data?.id ?? null
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in send-invoice-reminder:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
