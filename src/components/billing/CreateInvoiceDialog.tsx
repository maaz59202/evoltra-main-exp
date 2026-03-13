import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useClients, Client } from '@/hooks/useClients';
import { CreateInvoiceData, InvoiceItem } from '@/hooks/useInvoices';
import { supabase } from '@/integrations/supabase/client';

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
  const { clients } = useClients(organizationId);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientId, setClientId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [taxRate, setTaxRate] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, amount: 0 },
  ]);

  // Fetch projects for this organization
  useEffect(() => {
    const fetchProjects = async () => {
      if (!organizationId) return;
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

      if (!error && data) {
        setProjects(data);
      }
    };

    if (open) {
      fetchProjects();
    }
  }, [organizationId, open]);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    
    if (field === 'description') {
      item.description = value as string;
    } else if (field === 'quantity') {
      item.quantity = Number(value) || 0;
      item.amount = item.quantity * item.unit_price;
    } else if (field === 'unit_price') {
      item.unit_price = Number(value) || 0;
      item.amount = item.quantity * item.unit_price;
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (Number(taxRate) / 100);
  const total = subtotal + taxAmount;

  const handleSubmit = () => {
    const invoiceData: CreateInvoiceData = {
      organization_id: organizationId,
      client_id: clientId || undefined,
      project_id: projectId || undefined,
      subtotal,
      tax_rate: Number(taxRate),
      total,
      due_date: dueDate || undefined,
      notes: notes || undefined,
      items: items.filter(item => item.description && item.amount > 0),
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
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client & Project Selection */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client">Client (Optional)</Label>
              <Select value={clientId || "none"} onValueChange={(val) => setClientId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients?.map((client: Client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!clients || clients.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  No clients yet. Invite clients from the Projects section.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <Select value={projectId || "none"} onValueChange={(val) => setProjectId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
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
              {projects.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No projects yet. Create projects in the Projects section.
                </p>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      min="0"
                      step="0.01"
                      value={item.unit_price || ''}
                      onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between md:col-span-3">
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

          {/* Tax and Totals */}
          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tax Rate</span>
                <Input
                  type="number"
                  className="w-20"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <span className="font-medium">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-lg font-bold">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes for the client..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || items.every(i => !i.description || i.amount === 0)}
          >
            {isLoading ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateInvoiceDialog;
