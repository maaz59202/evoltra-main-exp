import { Spinner } from '@/components/ui/spinner';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, CalendarDays, ExternalLink,  ReceiptText, Printer } from '@/components/ui/icons';

import { useClientAuth } from '@/contexts/ClientAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatCurrencyAmount, getCurrencyConfig, type SupportedCurrencyCode } from '@/lib/currency';
import { getPaymentReceivingSections, parsePaymentReceivingDetailsCollection } from '@/lib/payment-receiving';
import { getClientPortalPaletteTheme, getStoredClientPortalPalette } from '@/lib/client-portal-theme';

type ClientInvoiceRecord = {
  id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  total: number;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  currency: SupportedCurrencyCode;
  client?: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
  organization?: {
    id: string;
    name: string;
    payment_receiving_details?: unknown;
    payment_link?: string | null;
  } | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
};

const getClientFacingInvoiceStatusLabel = (status: ClientInvoiceRecord['status']) => {
  if (status === 'paid') return 'Paid';
  if (status === 'cancelled') return 'Cancelled';
  return 'Unpaid';
};

const ClientInvoiceView = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { client, loading: authLoading } = useClientAuth();

  const [invoice, setInvoice] = useState<ClientInvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const palette = getStoredClientPortalPalette();

  useEffect(() => {
    if (!authLoading && !client) {
      navigate(`/client/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (client && invoiceId) {
      void fetchInvoice();
    }
  }, [client, authLoading, invoiceId, navigate]);

  const fetchInvoice = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('client-invoices', {
        body: { invoiceId },
        headers: { 'x-client-id': client?.id || '' },
      });

      if (error) {
        throw error;
      }

      if (!data?.success || !data.invoice) {
        throw new Error(data?.error || 'Invoice not found');
      }

      setInvoice(data.invoice);
    } catch (error) {
      console.error('Failed to fetch client invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const paymentReceivingMethods = useMemo(
    () => parsePaymentReceivingDetailsCollection(invoice?.organization),
    [invoice?.organization],
  );
  const paymentSections = useMemo(
    () => getPaymentReceivingSections(paymentReceivingMethods),
    [paymentReceivingMethods],
  );
  const taxAmount = useMemo(() => {
    if (!invoice) return 0;
    return Number(invoice.total) - Number(invoice.subtotal);
  }, [invoice]);
  const currencyLabel = useMemo(() => getCurrencyConfig(invoice?.currency).label, [invoice?.currency]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-8 text-center">
              <ReceiptText className="h-10 w-10 text-muted-foreground" />
              <div>
                <h1 className="text-xl font-semibold">Invoice unavailable</h1>
                <p className="mt-2 text-muted-foreground">
                  This invoice could not be loaded or you do not have access to it.
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate('/client/portal')}>
                Back to Portal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-print-page client-invoice-print bg-background p-6" style={getClientPortalPaletteTheme(palette)}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="invoice-screen-controls flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <ReceiptText className="h-4 w-4" />
              <span>{invoice.invoice_number}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Invoice</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Status: <span className="font-medium text-foreground">{getClientFacingInvoiceStatusLabel(invoice.status)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
            <Button variant="outline" onClick={() => navigate('/client/portal')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Portal
            </Button>
          </div>
        </div>

        <Card className="invoice-paper client-invoice-paper border-border/70 bg-card/70">
          <CardContent className="space-y-8 p-8">
            <div className="invoice-top-grid grid gap-8 lg:grid-cols-[1.05fr_1fr]">
              <div className="invoice-panel rounded-[28px] border border-border/70 bg-background/30 p-6">
                <p className="mb-6 text-sm uppercase tracking-[0.18em] text-muted-foreground">From</p>
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Organization</p>
                    <p className="mt-2 text-2xl font-semibold">{invoice.organization?.name || 'Evoltra'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Project</p>
                    <p className="mt-2 text-base text-muted-foreground">{invoice.project?.name || 'No linked project'}</p>
                  </div>
                </div>
              </div>

              <div className="invoice-panel rounded-[28px] border border-border/70 bg-background/30 p-6">
                <p className="mb-6 text-sm uppercase tracking-[0.18em] text-muted-foreground">Bill To</p>
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Client Name</p>
                    <p className="mt-2 text-lg font-semibold">{invoice.client?.name || client?.fullName || 'Client'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Client Email</p>
                    <p className="mt-2 text-base">{invoice.client?.email || client?.email || 'No email available'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="invoice-meta-grid grid gap-4 md:grid-cols-3">
              <div className="invoice-panel rounded-[24px] border border-border/70 bg-background/30 p-5">
                <p className="mb-3 text-sm uppercase tracking-[0.18em] text-muted-foreground">Issue Date</p>
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(invoice.created_at), 'MM/dd/yyyy')}</span>
                </div>
              </div>
              <div className="invoice-panel rounded-[24px] border border-border/70 bg-background/30 p-5">
                <p className="mb-3 text-sm uppercase tracking-[0.18em] text-muted-foreground">Due Date</p>
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>{invoice.due_date ? format(new Date(invoice.due_date), 'MM/dd/yyyy') : 'No due date'}</span>
                </div>
              </div>
              <div className="invoice-panel rounded-[24px] border border-border/70 bg-background/30 p-5">
                <p className="mb-3 text-sm uppercase tracking-[0.18em] text-muted-foreground">Currency</p>
                <span>{currencyLabel}</span>
              </div>
            </div>

            <div className="invoice-line-items overflow-hidden rounded-[28px] border border-border/70 bg-background/20">
              <div className="grid grid-cols-12 gap-3 border-b border-border/70 px-6 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <div className="col-span-6">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              <div>
                {invoice.items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-12 gap-3 px-6 py-4 ${index !== invoice.items.length - 1 ? 'border-b border-border/50' : ''}`}
                  >
                    <div className="col-span-6">{item.description}</div>
                    <div className="col-span-2">{Number(item.quantity)}</div>
                    <div className="col-span-2">{formatCurrencyAmount(Number(item.unit_price), invoice.currency)}</div>
                    <div className="col-span-2 text-right">{formatCurrencyAmount(Number(item.amount), invoice.currency)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="invoice-totals ml-auto max-w-sm space-y-2 rounded-[24px] border border-border/70 bg-background/30 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrencyAmount(Number(invoice.subtotal), invoice.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax ({Number(invoice.tax_rate).toFixed(2)}%)</span>
                <span>{formatCurrencyAmount(taxAmount, invoice.currency)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/70 pt-3 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrencyAmount(Number(invoice.total), invoice.currency)}</span>
              </div>
            </div>

            {invoice.notes && (
              <div className="invoice-panel rounded-[24px] border border-border/70 bg-background/30 p-5">
                <p className="mb-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            )}

            {paymentReceivingMethods.length > 0 && (
              <div className="invoice-panel rounded-[24px] border border-border/70 bg-background/30 p-5">
                <p className="mb-4 text-sm uppercase tracking-[0.18em] text-muted-foreground">Payment Receiving Details</p>
                <div className="space-y-5 text-sm">
                  {paymentSections.map((section) => (
                    <div key={section.key} className="space-y-3">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {section.title}
                      </p>
                      {section.rows.map((row) => (
                        <div key={`${section.key}-${row.label}`} className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                  {invoice.organization?.payment_link && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Payment Link</span>
                      <a
                        href={invoice.organization.payment_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        Open payment link
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientInvoiceView;
