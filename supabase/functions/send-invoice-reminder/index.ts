import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.9";

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");
    if (!gmailUser || !gmailPass) {
      console.log("Gmail SMTP not configured, skipping email");
      return new Response(
        JSON.stringify({ message: "Email service not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
        organization:organizations(name)
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

    if (!invoice.client?.email) {
      console.log("No client email found for invoice");
      return new Response(
        JSON.stringify({ error: "Client email not found" }),
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

    const emailContent = {
      initial: `
        <h1>Invoice ${invoice.invoice_number}</h1>
        <p>Dear ${invoice.client.name},</p>
        <p>Please find your invoice from ${invoice.organization?.name || "Evoltra"} below:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
          <p><strong>Amount Due:</strong> $${Number(invoice.total).toFixed(2)}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
        </div>
        ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ""}
        <p>Thank you for your business!</p>
      `,
      reminder: `
        <h1>Payment Reminder</h1>
        <p>Dear ${invoice.client.name},</p>
        <p>This is a friendly reminder that payment for the following invoice is due:</p>
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
          <p><strong>Amount Due:</strong> $${Number(invoice.total).toFixed(2)}</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
        </div>
        <p>Please arrange for payment at your earliest convenience.</p>
        <p>If you have already made this payment, please disregard this reminder.</p>
      `,
      overdue: `
        <h1 style="color: #dc3545;">Payment Overdue</h1>
        <p>Dear ${invoice.client.name},</p>
        <p>Our records indicate that the following invoice is now overdue:</p>
        <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
          <p><strong>Amount Due:</strong> $${Number(invoice.total).toFixed(2)}</p>
          <p><strong>Original Due Date:</strong> ${dueDate}</p>
        </div>
        <p>Please arrange for immediate payment to avoid any service interruptions.</p>
        <p>If you have any questions or concerns, please contact us immediately.</p>
      `,
    };

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });

    const info = await transporter.sendMail({
      from: `"Evoltra Billing" <${gmailUser}>`,
      to: invoice.client.email,
      subject: subjects[reminderType],
      html: emailContent[reminderType],
    });

    console.log("Email sent successfully:", info.messageId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${reminderType} email sent successfully`,
        emailId: info.messageId 
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
