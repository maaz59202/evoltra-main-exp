import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, CalendarDays, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import InvoiceStatusBadge from '@/components/billing/InvoiceStatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
        .select('organization_id')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      const allowedOrganizationIds = (membership || []).map(
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
          billingDb.from('organizations').select('id, name').eq('id', invoice.organization_id).maybeSingle(),
          billingDb
            .from('invoice_items')
            .select('id, description, quantity, unit_price, amount')
            .eq('invoice_id', invoice.id)
            .order('id', { ascending: true }),
        ]);

      return {
        ...invoice,
        client: client || null,
        project: project || null,
        organization: organization || null,
        items: items || [],
      } as InvoiceDetailsRecord;
    },
    enabled: !!invoiceId && !!user,
  });

  const taxAmount = useMemo(() => {
    if (!data) return 0;
    return Number(data.total) - Number(data.subtotal);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
              <span>USD ($)</span>
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
                  <div className="col-span-2">${Number(item.unit_price).toFixed(2)}</div>
                  <div className="col-span-2 text-right">${Number(item.amount).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="invoice-totals ml-auto max-w-sm space-y-2 rounded-[24px] border border-border/70 bg-background/30 p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${Number(data.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tax ({Number(data.tax_rate).toFixed(2)}%)</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/70 pt-3 text-base font-semibold">
              <span>Total</span>
              <span>${Number(data.total).toFixed(2)}</span>
            </div>
          </div>

          {data.notes && (
            <div className="invoice-panel rounded-[24px] border border-border/70 bg-background/30 p-5">
              <p className="mb-2 text-sm uppercase tracking-[0.18em] text-muted-foreground">Notes</p>
              <p className="text-sm text-muted-foreground">{data.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceDetails;
