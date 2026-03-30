import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarDays, Plus, Trash2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSubmit: (data: CreateInvoiceData) => void;
  isLoading?: boolean;
}

const CreateInvoiceDialog = ({
  open,
  onOpenChange,
  organizationId,
  onSubmit,
  isLoading,
}: CreateInvoiceDialogProps) => {
  const { user, profile } = useAuth();
  const { clients } = useClients(organizationId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizationName, setOrganizationName] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, amount: 0 },
  ]);

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
          .select('name')
          .eq('id', organizationId)
          .maybeSingle(),
      ]);

      if (!projectsError && projectData) {
        setProjects(projectData);
      }

      if (!orgError && orgData?.name) {
        setOrganizationName(orgData.name);
      }
    };

    if (open) {
      void fetchData();
    }
  }, [organizationId, open]);

  const selectedClient = useMemo(
    () => clients?.find((client) => client.id === clientId),
    [clientId, clients],
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

  const handleSubmit = () => {
    if (!clientId) return;

    const invoiceData: CreateInvoiceData = {
      organization_id: organizationId,
      client_id: clientId,
      project_id: projectId || undefined,
      subtotal,
      tax_rate: Number(taxRate),
      total,
      due_date: dueDate || undefined,
      notes: notes || undefined,
      items: items.filter((item) => item.description && item.amount > 0),
    };

    onSubmit(invoiceData);
  };

  const resetForm = () => {
    setClientId('');
    setProjectId('');
    setDueDate('');
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
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto border-border/70 bg-[#111114] p-0 text-foreground">
        <DialogHeader>
          <div className="border-b border-border/70 px-8 py-6">
            <DialogTitle className="text-3xl font-semibold tracking-tight text-white">Create Invoice</DialogTitle>
            <p className="mt-2 text-base text-muted-foreground">
              {organizationName || 'Evoltra'} draft
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-8 px-8 py-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr]">
            <div className="rounded-[28px] border border-border/70 bg-card/60 p-6 shadow-sm">
              <p className="mb-6 text-sm uppercase tracking-[0.18em] text-muted-foreground">From</p>
              <div className="space-y-2">
                <p className="text-2xl font-semibold text-white">
                  {profile?.full_name || user?.email || 'Your name'}
                </p>
                <p className="text-base text-muted-foreground">{profile?.email || user?.email || 'your@email.com'}</p>
                <p className="text-base text-muted-foreground">
                  {profile?.company_name || organizationName || 'Evoltra'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Bill To</p>

              {!clients || clients.length === 0 ? (
                <Alert className="border-border/70 bg-card/60">
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
                    <Label htmlFor="client">Client</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger className="h-14 rounded-full border-border/70 bg-card/60 px-5 text-base">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client: Client) => (
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
                      className="h-14 rounded-full border-border/70 bg-card/60 px-5 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Client Email</Label>
                    <Input
                      value={selectedClient?.email || ''}
                      readOnly
                      placeholder="Client Email"
                      className="h-14 rounded-full border-border/70 bg-card/60 px-5 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={projectId || 'none'} onValueChange={(value) => setProjectId(value === 'none' ? '' : value)}>
                      <SelectTrigger className="h-14 rounded-full border-border/70 bg-card/60 px-5 text-base">
                        <SelectValue placeholder="Project (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  className="h-14 rounded-full border-border/70 bg-card/60 pl-11 pr-5 text-base"
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
                  className="h-14 rounded-full border-border/70 bg-card/60 pl-11 pr-5 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value="USD ($)"
                readOnly
                className="h-14 rounded-full border-border/70 bg-card/60 px-5 text-base"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Line Items</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addItem} className="text-base">
                <Plus className="mr-1 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-border/70 bg-card/60">
              <div className="grid grid-cols-12 gap-3 border-b border-border/70 px-6 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
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
                      'grid grid-cols-12 gap-3 px-6 py-4',
                      index !== items.length - 1 && 'border-b border-border/50',
                    )}
                  >
                    <div className="col-span-6">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(event) => updateItem(index, 'description', event.target.value)}
                        className="h-12 rounded-2xl border-border/70 bg-background/40"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                        className="h-12 rounded-2xl border-border/70 bg-background/40"
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
                        className="h-12 rounded-2xl border-border/70 bg-background/40"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <span className="font-medium">${item.amount.toFixed(2)}</span>
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

          <div className="space-y-3 rounded-[28px] border border-border/70 bg-card/60 p-5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tax Rate</span>
                <Input
                  type="number"
                  className="h-10 w-24 rounded-xl border-border/70 bg-background/50"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(event) => setTaxRate(event.target.value)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <span className="font-medium">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border/70 pt-3">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-lg font-bold">${total.toFixed(2)}</span>
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
              className="rounded-[24px] border-border/70 bg-card/60 px-5 py-4"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border/70 px-8 py-5">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !clientId || !clients?.length || items.every((item) => !item.description || item.amount === 0)}
          >
            {isLoading ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceDialog;
