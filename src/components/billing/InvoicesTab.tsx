import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MoreHorizontal, Send, CheckCircle, FileDown, Trash2, DollarSign, AlertTriangle, ExternalLink } from '@/components/ui/icons';
import { format } from 'date-fns';
import { useInvoices, Invoice } from '@/hooks/useInvoices';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import CreateInvoiceDialog from './CreateInvoiceDialog';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyAmount } from '@/lib/currency';
import { supabase } from '@/integrations/supabase/client';

interface InvoicesTabProps {
  organizationId: string;
  canManageBilling: boolean;
}

const InvoicesTab = ({ organizationId, canManageBilling }: InvoicesTabProps) => {
  const { invoices, isLoading, stats, createInvoice, updateDraftInvoice, updateInvoiceStatus, sendInvoiceReminder, deleteInvoice } = useInvoices(organizationId);
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editingInitialData, setEditingInitialData] = useState<{
    client_id?: string | null;
    project_id?: string | null;
    due_date?: string | null;
    currency?: Invoice['currency'];
    tax_rate?: number;
    notes?: string | null;
    items?: {
      description: string;
      quantity: number;
      unit_price: number;
      amount: number;
    }[];
  } | null>(null);
  const invoiceCurrencies = Array.from(new Set((invoices || []).map((invoice) => invoice.currency)));
  const statsCurrency = invoiceCurrencies.length === 1 ? invoiceCurrencies[0] : null;

  const filteredInvoices = invoices?.filter((invoice: Invoice) => 
    statusFilter === 'all' || invoice.status === statusFilter
  );

  const handleMarkPaid = (invoiceId: string) => {
    updateInvoiceStatus.mutate({
      invoiceId,
      status: 'paid',
      paid_at: new Date().toISOString(),
    });
  };

  const handleMarkUnpaid = (invoiceId: string) => {
    updateInvoiceStatus.mutate({
      invoiceId,
      status: 'sent',
      clearPaidAt: true,
    });
  };

  const handleEditDraft = async (invoice: Invoice) => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('description, quantity, unit_price, amount')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setEditingInvoiceId(invoice.id);
      setEditingInitialData({
        client_id: invoice.client_id,
        project_id: invoice.project_id,
        due_date: invoice.due_date,
        currency: invoice.currency,
        tax_rate: Number(invoice.tax_rate),
        notes: invoice.notes,
        items: (data || []).map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          amount: Number(item.amount),
        })),
      });
      setCreateDialogOpen(true);
    } catch (error) {
      console.error('Failed to load draft invoice for editing:', error);
      toast({
        title: 'Failed to load draft',
        description: error instanceof Error ? error.message : 'Unable to open this draft for editing.',
        variant: 'destructive',
      });
    }
  };

  const handleSendInvoice = async (invoiceId: string, currentStatus: string) => {
    const invoice = invoices?.find((item) => item.id === invoiceId);
    if (!invoice?.client_id || !invoice.client?.email) {
      toast({
        title: 'Client required',
        description: 'Add a client with an email address before sending this invoice.',
        variant: 'destructive',
      });
      return;
    }

    const reminderType =
      currentStatus === 'draft' ? 'initial' :
      currentStatus === 'overdue' ? 'overdue' :
      'reminder';

    try {
      await sendInvoiceReminder.mutateAsync({ invoiceId, reminderType });

      if (currentStatus === 'draft') {
        await updateInvoiceStatus.mutateAsync({ invoiceId, status: 'sent' });
      }
    } catch (error) {
      console.error('Failed to send invoice email:', error);
    }
  };

  const handleExportCSV = () => {
    if (!invoices || invoices.length === 0) return;

    const headers = ['Invoice #', 'Client', 'Amount', 'Status', 'Due Date', 'Created'];
      const rows = invoices.map((inv: Invoice) => [
        inv.invoice_number,
        inv.client?.name || 'N/A',
        formatCurrencyAmount(Number(inv.total), inv.currency),
        inv.status,
        inv.due_date ? format(new Date(inv.due_date), 'MMM dd, yyyy') : 'N/A',
        format(new Date(inv.created_at), 'MMM dd, yyyy'),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewInvoice = (invoiceId: string) => {
    window.open(`/billing/invoices/${invoiceId}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-border/60 bg-card/35 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Outstanding
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-0">
            <div className="text-[1.65rem] font-semibold tracking-tight">
              {statsCurrency ? formatCurrencyAmount(stats.totalOutstanding, statsCurrency) : `${stats.totalOutstanding.toFixed(2)} mixed`}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/35 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue Invoices
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-0">
            <div className="text-[1.65rem] font-semibold tracking-tight text-destructive">{stats.overdueCount}</div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/35 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-2 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid This Month
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-0">
            <div className="text-[1.65rem] font-semibold tracking-tight text-primary">
              {statsCurrency ? formatCurrencyAmount(stats.paidThisMonth, statsCurrency) : `${stats.paidThisMonth.toFixed(2)} mixed`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[150px] rounded-lg border-border/60 bg-background">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={handleExportCSV} disabled={!invoices?.length}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="h-9 rounded-lg px-4" disabled={!canManageBilling}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Mark Invoice paid only after you confirm receipt outside the app.
      </p>

      {/* Invoices Table */}
      <Card className="overflow-hidden border-border/60 bg-card/35 shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredInvoices?.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <p>No invoices found</p>
              <Button variant="link" onClick={() => setCreateDialogOpen(true)} disabled={!canManageBilling}>
                Create your first invoice
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.map((invoice: Invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.client?.name || 'N/A'}</TableCell>
                    <TableCell>{formatCurrencyAmount(Number(invoice.total), invoice.currency)}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell>
                      {invoice.due_date 
                        ? format(new Date(invoice.due_date), 'MMM dd, yyyy')
                        : 'No due date'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewInvoice(invoice.id)}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Invoice
                            </DropdownMenuItem>
                            {canManageBilling && invoice.status === 'paid' && (
                              <DropdownMenuItem onClick={() => handleMarkUnpaid(invoice.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark as Unpaid
                              </DropdownMenuItem>
                            )}
                            {canManageBilling && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                              <>
                                <DropdownMenuItem onClick={() => void handleSendInvoice(invoice.id, invoice.status)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  {invoice.status === 'draft' ? 'Send Invoice' : 'Send Reminder'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleMarkPaid(invoice.id)}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Record Payment
                                </DropdownMenuItem>
                              </>
                            )}
                            {canManageBilling && invoice.status === 'draft' && (
                              <DropdownMenuItem onClick={() => void handleEditDraft(invoice)}>
                                Edit Draft
                              </DropdownMenuItem>
                            )}
                            {canManageBilling && (
                             <DropdownMenuItem 
                               onClick={() => deleteInvoice.mutate(invoice.id)}
                               className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setEditingInvoiceId(null);
            setEditingInitialData(null);
          }
        }}
        organizationId={organizationId}
        mode={editingInvoiceId ? 'edit' : 'create'}
        initialData={editingInitialData}
        onSubmit={(data) => {
          if (editingInvoiceId) {
            updateDraftInvoice.mutate(
              { invoiceId: editingInvoiceId, invoiceData: data },
              {
                onSuccess: () => {
                  setCreateDialogOpen(false);
                  setEditingInvoiceId(null);
                  setEditingInitialData(null);
                },
              },
            );
            return;
          }

          createInvoice.mutate(data, {
            onSuccess: () => {
              setCreateDialogOpen(false);
              setEditingInvoiceId(null);
              setEditingInitialData(null);
            },
          });
        }}
        isLoading={createInvoice.isPending || updateDraftInvoice.isPending}
      />
    </div>
  );
};

export default InvoicesTab;
