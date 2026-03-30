import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  organization_id: string;
  client_id: string | null;
  project_id: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  total: number;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  items?: InvoiceItem[];
  client?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateInvoiceData {
  organization_id: string;
  client_id?: string;
  project_id?: string;
  status?: string;
  subtotal: number;
  tax_rate: number;
  total: number;
  due_date?: string;
  notes?: string;
  items: InvoiceItem[];
}

const billingDb = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
  functions: typeof supabase.functions;
};

export const useInvoices = (organizationId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['invoices', organizationId],
    queryFn: async (): Promise<Invoice[]> => {
      if (!organizationId) return [];

      const { data, error } = await billingDb
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch clients separately
      const clientIds = data?.filter(inv => inv.client_id).map(inv => inv.client_id) || [];
      
      let clientsMap: Record<string, { id: string; name: string; email: string }> = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name, email')
          .in('id', clientIds as string[]);
        
        clientsMap = (clients || []).reduce((acc, c) => {
          acc[c.id] = c;
          return acc;
        }, {} as Record<string, { id: string; name: string; email: string }>);
      }

      return data?.map(inv => ({
        ...inv,
        client: inv.client_id ? clientsMap[inv.client_id] : undefined,
      })) || [];
    },
    enabled: !!organizationId,
  });

  const createInvoice = useMutation({
    mutationFn: async (invoiceData: CreateInvoiceData) => {
      const sanitizedItems = invoiceData.items
        .filter((item) => item.description.trim() && item.quantity > 0)
        .map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

      if (sanitizedItems.length === 0) {
        throw new Error('Add at least one valid invoice item before creating the invoice.');
      }

      const { data, error } = await billingDb.rpc('create_invoice_with_items', {
        p_organization_id: invoiceData.organization_id,
        p_client_id: invoiceData.client_id ?? null,
        p_project_id: invoiceData.project_id ?? null,
        p_due_date: invoiceData.due_date ?? null,
        p_notes: invoiceData.notes ?? null,
        p_tax_rate: invoiceData.tax_rate,
        p_status: invoiceData.status ?? 'draft',
        p_items: sanitizedItems,
      });

      if (error) throw new Error(error.message || 'Failed to create invoice');
      if (!data) throw new Error('Failed to create invoice');

      return data as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Invoice created',
        description: 'The invoice has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ invoiceId, status, paid_at }: { invoiceId: string; status: string; paid_at?: string }) => {
      const updateData: Record<string, unknown> = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (paid_at) {
        updateData.paid_at = paid_at;
      }

      const { data, error } = await billingDb
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Invoice updated',
        description: 'The invoice status has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error: itemsError } = await billingDb
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);

      if (itemsError) throw itemsError;

      const { error } = await billingDb
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Invoice deleted',
        description: 'The invoice has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting invoice',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const sendInvoiceReminder = useMutation({
    mutationFn: async ({ invoiceId, reminderType }: { invoiceId: string; reminderType: 'initial' | 'reminder' | 'overdue' }) => {
      const { data, error } = await supabase.functions.invoke('send-invoice-reminder', {
        body: { invoiceId, reminderType },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: variables.reminderType === 'initial' ? 'Invoice sent' : 'Reminder sent',
        description: 'The email has been sent to the client.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error sending email',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate stats
  const stats = {
    totalOutstanding: invoices?.filter(inv => inv.status === 'sent' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + Number(inv.total), 0) || 0,
    overdueCount: invoices?.filter(inv => inv.status === 'overdue').length || 0,
    paidThisMonth: invoices?.filter(inv => {
      if (inv.status !== 'paid' || !inv.paid_at) return false;
      const paidDate = new Date(inv.paid_at);
      const now = new Date();
      return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
    }).reduce((sum, inv) => sum + Number(inv.total), 0) || 0,
  };

  return {
    invoices,
    isLoading,
    error,
    stats,
    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    sendInvoiceReminder,
  };
};
