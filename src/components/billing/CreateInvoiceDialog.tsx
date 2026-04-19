import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarDays, Plus, Trash2 } from '@/components/ui/icons';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useClients, Client } from '@/hooks/useClients';
import { CreateInvoiceData, InvoiceItem } from '@/hooks/useInvoices';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  formatCurrencyAmount,
  type SupportedCurrencyCode,
} from '@/lib/currency';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSubmit: (data: CreateInvoiceData) => void | Promise<void>;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
  initialData?: {
    client_id?: string | null;
    project_id?: string | null;
    due_date?: string | null;
    currency?: SupportedCurrencyCode;
    tax_rate?: number;
    notes?: string | null;
    items?: InvoiceItem[];
  } | null;
}

const CreateInvoiceDialog = ({
  open,
  onOpenChange,
  organizationId,
  onSubmit,
  isLoading,
  mode = 'create',
  initialData = null,
}: CreateInvoiceDialogProps) => {
  const { user, profile } = useAuth();
  const { clients } = useClients(organizationId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectClients, setProjectClients] = useState<Client[]>([]);
  const [organizationName, setOrganizationName] = useState('');
  const [paymentAccountName, setPaymentAccountName] = useState('');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [paymentBankName, setPaymentBankName] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrencyCode>(DEFAULT_CURRENCY);
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, amount: 0 },
  ]);

  const isEditMode = mode === 'edit';

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return;

      const [{ data: projectData, error: projectsError }, { data: orgData, error: orgError }] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name')
          .eq('organization_id', organizationId)
          .order('name', { ascending: true }),
        supabase
          .from('organizations')
          .select('name, payment_account_name, payment_account_number, payment_bank_name, payment_link')
          .eq('id', organizationId)
          .maybeSingle(),
      ]);

      if (!projectsError && projectData) {
        setProjects(projectData);
      }

      if (!orgError && orgData?.name) {
        setOrganizationName(orgData.name);
        setPaymentAccountName(orgData.payment_account_name || '');
        setPaymentAccountNumber(orgData.payment_account_number || '');
        setPaymentBankName(orgData.payment_bank_name || '');
        setPaymentLink(orgData.payment_link || '');
      }

    };

    if (open) {
      void fetchData();
    }
  }, [clients, organizationId, open]);

  useEffect(() => {
    if (!open) return;

    if (isEditMode && initialData) {
      setProjectId(initialData.project_id || '');
      setClientId(initialData.client_id || '');
      setDueDate(initialData.due_date || '');
      setCurrency(initialData.currency || DEFAULT_CURRENCY);
      setTaxRate(String(initialData.tax_rate ?? 0));
      setNotes(initialData.notes || '');

      const seededItems = (initialData.items || [])
        .filter((item) => item.description)
        .map((item) => {
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unit_price) || 0;
          return {
            description: item.description,
            quantity,
            unit_price: unitPrice,
            amount: quantity * unitPrice,
          };
        });

      setItems(seededItems.length > 0 ? seededItems : [{ description: '', quantity: 1, unit_price: 0, amount: 0 }]);
      return;
    }

    if (!isEditMode) {
      setClientId('');
      setProjectId('');
      setDueDate('');
      setCurrency(DEFAULT_CURRENCY);
      setTaxRate('0');
      setNotes('');
      setItems([{ description: '', quantity: 1, unit_price: 0, amount: 0 }]);
    }
  }, [initialData, isEditMode, open]);

  useEffect(() => {
    if (!projectId) {
      setClientId('');
      setProjectClients([]);
      return;
    }

    const fetchProjectClients = async () => {
      const { data, error } = await supabase
        .from('project_clients')
        .select(`
          client_user_id,
          created_at,
          client_users (
            id,
            email,
            full_name
          )
        `)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching project clients for invoice:', error);
        setProjectClients([]);
        setClientId('');
        return;
      }

      const orgClientsByEmail = new Map<string, Client>();
      (clients || []).forEach((client) => {
        const key = client.email?.toLowerCase();
        if (key) {
          orgClientsByEmail.set(key, client);
        }
      });

      const resolvedClients = ((data as any[]) || []).reduce<Client[]>((acc, projectClient) => {
        const clientUser = projectClient.client_users;
        const email = clientUser?.email?.toLowerCase?.() || null;
        if (!email) return acc;

        const resolvedClient =
          orgClientsByEmail.get(email) ||
          ({
            id: `client-user:${projectClient.client_user_id}`,
            name: clientUser?.full_name || email.split('@')[0] || 'Client',
            email,
            organization_id: organizationId,
            created_at: projectClient.created_at || new Date().toISOString(),
            source_client_user_id: projectClient.client_user_id,
            persisted: false,
          } satisfies Client);

        if (acc.some((client) => client.email?.toLowerCase() === email)) {
          return acc;
        }

        return [...acc, resolvedClient];
      }, []).sort((a, b) => a.name.localeCompare(b.name));

      setProjectClients(resolvedClients);

      if (!resolvedClients.some((client) => client.id === clientId)) {
        setClientId('');
      }
    };

    void fetchProjectClients();
  }, [clientId, clients, organizationId, projectId]);

  const availableClients = useMemo(() => {
    if (!projectId) return [];
    return projectClients;
  }, [projectClients, projectId]);

  const selectedClient = useMemo(
    () => availableClients.find((client) => client.id === clientId),
    [availableClients, clientId],
  );

  const addItem = () => {
    setItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const nextItems = [...prev];
      const item = { ...nextItems[index] };

      if (field === 'description') {
        item.description = value as string;
      } else if (field === 'quantity') {
        item.quantity = Number(value) || 0;
      } else if (field === 'unit_price') {
        item.unit_price = Number(value) || 0;
      }

      item.amount = item.quantity * item.unit_price;
      nextItems[index] = item;
      return nextItems;
    });
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (Number(taxRate) / 100);
  const total = subtotal + taxAmount;
  const issueDate = new Date().toISOString().slice(0, 10);

  const ensureInvoiceClient = async (client: Client): Promise<string> => {
    if (client.persisted) {
      return client.id;
    }

    const normalizedEmail = client.email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('The selected client does not have an email address yet.');
    }

    const { data: existingClient, error: existingClientError } = await supabase
      .from('clients')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingClientError) {
      throw existingClientError;
    }

    if (existingClient?.id) {
      return existingClient.id;
    }

    const { data: createdClient, error: createClientError } = await supabase
      .from('clients')
      .insert({
        organization_id: organizationId,
        name: client.name,
        email: normalizedEmail,
      })
      .select('id')
      .single();

    if (createClientError || !createdClient?.id) {
      throw createClientError || new Error('Failed to create a billing client record.');
    }

    return createdClient.id;
  };

  const handleSubmit = async () => {
    if (!clientId || !selectedClient) return;

    const resolvedClientId = await ensureInvoiceClient(selectedClient);

    const invoiceData: CreateInvoiceData = {
      organization_id: organizationId,
      client_id: resolvedClientId,
      project_id: projectId || undefined,
      currency,
      subtotal,
      tax_rate: Number(taxRate),
      total,
      due_date: dueDate || undefined,
      notes: notes || undefined,
      items: items.filter((item) => item.description && item.amount > 0),
    };

    await onSubmit(invoiceData);
  };

  const resetForm = () => {
    setClientId('');
    setProjectId('');
    setDueDate('');
    setCurrency(DEFAULT_CURRENCY);
    setTaxRate('0');
    setNotes('');
    setItems([{ description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto border-border/70 bg-background p-0 text-foreground shadow-2xl">
        <DialogHeader>
          <div className="border-b border-border/70 bg-card/50 px-8 py-5">
            <DialogTitle className="text-[2rem] font-semibold tracking-tight text-foreground">
              {isEditMode ? 'Edit Draft Invoice' : 'Create Invoice'}
            </DialogTitle>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {organizationName || 'Evoltra'} {isEditMode ? 'draft update' : 'draft'}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-7 px-8 py-7">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
            <div className="rounded-[24px] border border-border/70 bg-card p-5 shadow-sm">
              <p className="mb-5 text-xs uppercase tracking-[0.22em] text-muted-foreground">From</p>
              <div className="space-y-1.5">
                <p className="text-[1.65rem] font-semibold text-foreground">
                  {profile?.full_name || user?.email || 'Your name'}
                </p>
                <p className="text-sm text-muted-foreground">{profile?.email || user?.email || 'your@email.com'}</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.company_name || organizationName || 'Evoltra'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Bill To</p>

              {!clients || clients.length === 0 ? (
                <Alert className="border-border/70 bg-card">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Add a client first</AlertTitle>
                  <AlertDescription>
                    Invoices need a client recipient before they can be created or sent.
                    <div className="mt-3">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/projects" onClick={() => onOpenChange(false)}>
                          Go to Projects
                        </Link>
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={projectId || 'none'} onValueChange={(value) => setProjectId(value === 'none' ? '' : value)}>
                      <SelectTrigger className="h-12 rounded-2xl border-border/70 bg-background px-4 text-sm">
                        <SelectValue placeholder="Select a project first" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project selected</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {!projectId ? (
                    <Alert className="border-border/70 bg-card">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Select a project first</AlertTitle>
                      <AlertDescription>
                        Client choices are now scoped to the selected project so invoices always point to the right client.
                      </AlertDescription>
                    </Alert>
                  ) : availableClients.length === 0 ? (
                    <Alert className="border-border/70 bg-card">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No clients linked to this project</AlertTitle>
                      <AlertDescription>
                        Invite or assign a client to this project first, then create the invoice.
                        <div className="mt-3">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/project/${projectId}`} onClick={() => onOpenChange(false)}>
                              Open Project
                            </Link>
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="client">Client</Label>
                        <Select value={clientId} onValueChange={setClientId}>
                          <SelectTrigger className="h-12 rounded-2xl border-border/70 bg-background px-4 text-sm">
                            <SelectValue placeholder="Select a project client" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableClients.map((client: Client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Client Name</Label>
                        <Input
                          value={selectedClient?.name || ''}
                          readOnly
                          placeholder="Client Name"
                          className="h-12 rounded-2xl border-border/70 bg-background px-4 text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Client Email</Label>
                        <Input
                          value={selectedClient?.email || ''}
                          readOnly
                          placeholder="Client Email"
                          className="h-12 rounded-2xl border-border/70 bg-background px-4 text-sm"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <div className="relative">
                <CalendarDays className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  readOnly
                  className="h-12 rounded-2xl border-border/70 bg-background pl-11 pr-4 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <div className="relative">
                <CalendarDays className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="h-12 rounded-2xl border-border/70 bg-background pl-11 pr-4 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value as SupportedCurrencyCode)}>
                <SelectTrigger
                  id="currency"
                  className="h-12 rounded-2xl border-border/70 bg-background px-4 text-sm"
                >
                  <SelectValue placeholder="Choose currency" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Line Items</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addItem} className="h-9 rounded-xl px-3 text-sm">
                <Plus className="mr-1 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-border/70 bg-card">
              <div className="grid grid-cols-12 gap-3 border-b border-border/70 bg-muted/30 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <div className="col-span-6">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>

              <div>
                {items.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      'grid grid-cols-12 gap-3 px-5 py-3.5',
                      index !== items.length - 1 && 'border-b border-border/50',
                    )}
                  >
                    <div className="col-span-6">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(event) => updateItem(index, 'description', event.target.value)}
                        className="h-11 rounded-xl border-border/70 bg-background text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                        className="h-11 rounded-xl border-border/70 bg-background text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Rate"
                        value={item.unit_price || ''}
                        onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                        className="h-11 rounded-xl border-border/70 bg-background text-sm"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                       <span className="text-sm font-medium">{formatCurrencyAmount(item.amount, currency)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-border/70 bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-sm font-medium">{formatCurrencyAmount(subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Tax Rate</span>
                <Input
                  type="number"
                  className="h-9 w-20 rounded-lg border-border/70 bg-background text-sm"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(event) => setTaxRate(event.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <span className="text-sm font-medium">{formatCurrencyAmount(taxAmount, currency)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/70 pt-3">
              <span className="text-base font-semibold">Total</span>
              <span className="text-xl font-bold">{formatCurrencyAmount(total, currency)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes for the client..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="rounded-[20px] border-border/70 bg-card px-4 py-3 text-sm"
            />
          </div>

          {(paymentAccountName || paymentAccountNumber || paymentBankName || paymentLink) && (
            <div className="space-y-3 rounded-[24px] border border-border/70 bg-card p-5">
              <Label className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Payment Receiving Details
              </Label>
              {paymentAccountName && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Account Name</span>
                  <span>{paymentAccountName}</span>
                </div>
              )}
              {paymentAccountNumber && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Account Number</span>
                  <span>{paymentAccountNumber}</span>
                </div>
              )}
              {paymentBankName && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Bank Name</span>
                  <span>{paymentBankName}</span>
                </div>
              )}
              {paymentLink && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Payment Link</span>
                  <span className="truncate text-right">{paymentLink}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/70 bg-card/40 px-8 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl px-5">
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            className="rounded-xl px-5"
            disabled={
              isLoading ||
              !projectId ||
              !clientId ||
              !availableClients.length ||
              items.every((item) => !item.description || item.amount === 0)
            }
          >
              {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Draft' : 'Create Invoice'}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceDialog;
