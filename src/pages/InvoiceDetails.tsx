import { Spinner } from '@/components/ui/spinner';
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, CalendarDays, ExternalLink, FileText } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import InvoiceStatusBadge from '@/components/billing/InvoiceStatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyAmount, getCurrencyConfig, type SupportedCurrencyCode } from '@/lib/currency';
import { getPaymentReceivingSections, parsePaymentReceivingDetailsCollection } from '@/lib/payment-receiving';

type InvoiceDetailsRecord = {
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
  client_id: string | null;
  project_id: string | null;
  organization_id: string;
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
    payment_account_name?: string | null;
    payment_account_number?: string | null;
    payment_bank_name?: string | null;
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

const billingDb = supabase as unknown as {
  from: (table: string) => any;
};

const InvoiceDetails = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { user, profile } = useAuth();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Evoltra';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoice', invoiceId, user?.id],
    queryFn: async (): Promise<InvoiceDetailsRecord | null> => {
      if (!invoiceId || !user) {
        return null;
      }

      const { data: membership, error: membershipError } = await billingDb
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      const allowedOrganizationIds = (membership || [])
        .filter((row: { organization_id: string; role: string | null }) => row.role === 'owner' || row.role === 'admin')
        .map(
        (row: { organization_id: string }) => row.organization_id,
      );
      if (allowedOrganizationIds.length === 0) {
        return null;
      }

      const { data: invoice, error: invoiceError } = await billingDb
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .in('organization_id', allowedOrganizationIds)
        .maybeSingle();

      if (invoiceError) throw invoiceError;
      if (!invoice) return null;

      const [{ data: client }, { data: project }, { data: organization }, { data: items }] =
        await Promise.all([
          invoice.client_id
            ? billingDb.from('clients').select('id, name, email').eq('id', invoice.client_id).maybeSingle()
            : Promise.resolve({ data: null }),
          invoice.project_id
            ? billingDb.from('projects').select('id, name').eq('id', invoice.project_id).maybeSingle()
            : Promise.resolve({ data: null }),
          billingDb
            .from('organizations')
            .select('id, name, payment_receiving_details, payment_account_name, payment_account_number, payment_bank_name, payment_link')
            .eq('id', invoice.organization_id)
            .maybeSingle(),
          billingDb
            .from('invoice_items')
            .select('id, description, quantity, unit_price, amount')
            .eq('invoice_id', invoice.id)
            .order('id', { ascending: true }),
        ]);

      let resolvedOrganization = organization || null;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (resolvedOrganization && session?.access_token) {
        const { data: decryptedResponse, error: decryptedError } = await supabase.functions.invoke('get-payment-receiving-details', {
          body: { organizationId: invoice.organization_id },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!decryptedError && decryptedResponse?.organization) {
          resolvedOrganization = {
            ...resolvedOrganization,
            ...decryptedResponse.organization,
          };
        }
      }

      return {
        ...invoice,
        client: client || null,
        project: project || null,
        organization: resolvedOrganization,
        items: items || [],
      } as InvoiceDetailsRecord;
    },
    enabled: !!invoiceId && !!user,
  });

  const taxAmount = useMemo(() => {
    if (!data) return 0;
    return Number(data.total) - Number(data.subtotal);
  }, [data]);

  const paymentReceivingMethods = useMemo(
    () => parsePaymentReceivingDetailsCollection(data?.organization),
    [data?.organization],
  );

  const paymentReceivingSections = useMemo(
    () => getPaymentReceivingSections(paymentReceivingMethods),
    [paymentReceivingMethods],
  );

  const currencyLabel = useMemo(() => getCurrencyConfig(data?.currency).label, [data?.currency]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <div>
              <h1 className="text-xl font-semibold">Invoice not found</h1>
              <p className="mt-2 text-muted-foreground">
                This invoice either does not exist or you do not have permission to view it.
              </p>
            </div>
            <Button variant="outline" onClick={() => window.close()}>
              Close Tab
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="invoice-print-page mx-auto max-w-5xl space-y-6">
      <div className="invoice-screen-controls flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{data.invoice_number}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice</h1>
        </div>

        <div className="flex items-center gap-2">
          <InvoiceStatusBadge status={data.status} />
          <Button variant="outline" onClick={() => window.print()}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
          <Button variant="ghost" onClick={() => window.close()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      <Card className="invoice-paper border-border/70 bg-card/70">
        <CardContent className="space-y-8 p-8">
          <div className="invoice-top-grid grid gap-8 lg:grid-cols-[1.05fr_1fr]">
            <div className="invoice-panel flex h-full flex-col rounded-[28px] border border-border/70 bg-background/30 p-6">
              <p className="mb-6 text-sm uppercase tracking-[0.18em] text-muted-foreground">From</p>
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Sender</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {profile?.full_name || user?.email || data.organization?.name || 'Evoltra'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Email</p>
                  <p className="mt-2 text-base text-muted-foreground">
                    {profile?.email || user?.email || 'No sender email available'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Organization</p>
                  <p className="mt-2 text-base text-muted-foreground">
                    {profile?.company_name || data.organization?.name || 'Evoltra'}
                  </p>
                </div>
              </div>
            </div>

            <div className="invoice-panel flex h-full flex-col rounded-[28px] border border-border/70 bg-background/30 p-6">
              <p className="mb-6 text-sm uppercase tracking-[0.18em] text-muted-foreground">Bill To</p>
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Client Name</p>
                  <p className="mt-2 text-lg font-semibold">{data.client?.name || 'No client assigned'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Client Email</p>
                  <p className="mt-2 text-base">{data.client?.email || 'No email available'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Project</p>
                  <p className="mt-2 text-base">{data.project?.name || 'No linked project'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="invoice-meta-grid grid gap-4 md:grid-cols-3">
            <div className="invoice-panel rounded-[24px] border border-border/70 bg-background/30 p-5">
              <p className="mb-3 text-sm uppercase tracking-[0.18em] text-muted-foreground">Issue Date</p>
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(data.created_at), 'MM/dd/yyyy')}</span>
              </div>
            </div>

            <div className="invoice-panel rounded-[24px] border border-border/70 bg-background/30 p-5">
              <p className="mb-3 text-sm uppercase tracking-[0.18em] text-muted-foreground">Due Date</p>
              <div className="flex items-center gap-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>{data.due_date ? format(new Date(data.due_date), 'MM/dd/yyyy') : 'No due date'}</span>
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
              {data.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 gap-3 px-6 py-4 ${index !== data.items.length - 1 ? 'border-b border-border/50' : ''}`}
                >
                  <div className="col-span-6">{item.description}</div>
                  <div className="col-span-2">{Number(item.quantity)}</div>
                  <div className="col-span-2">{formatCurrencyAmount(Number(item.unit_price), data.currency)}</div>
                  <div className="col-span-2 text-right">{formatCurrencyAmount(Number(item.amount), data.currency)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="invoice-totals ml-auto max-w-sm space-y-2 rounded-[24px] border border-border/70 bg-background/30 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrencyAmount(Number(data.subtotal), data.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax ({Number(data.tax_rate).toFixed(2)}%)</span>
              <span>{formatCurrencyAmount(taxAmount, data.currency)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/70 pt-3 text-base font-semibold">
              <span>Total</span>
              <span>{formatCurrencyAmount(Number(data.total), data.currency)}</span>
            </div>
          </div>

          {data.notes && (
            <div className="invoice-panel rounded-[24px] border border-border/70 bg-background/30 p-5">
              <p className="mb-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
              <p className="text-sm text-muted-foreground">{data.notes}</p>
            </div>
          )}

          {paymentReceivingMethods.length > 0 && (
            <div className="invoice-panel rounded-[24px] border border-border/70 bg-background/30 p-5">
              <p className="mb-4 text-sm uppercase tracking-[0.18em] text-muted-foreground">Payment Receiving Details</p>
              <div className="space-y-5 text-sm">
                {paymentReceivingSections.map((section) => (
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
                {data.organization?.payment_link && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Payment Link</span>
                    <a
                      href={data.organization.payment_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Open payment link
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {paymentReceivingMethods.length === 0 && (
            <div className="invoice-panel rounded-[24px] border border-amber-500/40 bg-amber-500/10 p-5">
              <p className="mb-2 text-sm uppercase tracking-[0.18em] text-amber-200">Payment Receiving Details Incomplete</p>
              <p className="text-sm text-amber-100/90">
                Add a valid payment method in Billing before sending this invoice.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceDetails;
