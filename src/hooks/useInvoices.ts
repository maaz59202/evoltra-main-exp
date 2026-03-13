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

// Helper to execute raw queries for tables not in generated types
async function queryTable<T>(
  table: string, 
  options: { 
    select?: string; 
    eq?: [string, unknown]; 
    in?: [string, unknown[]];
    order?: [string, { ascending: boolean }];
    insert?: Record<string, unknown> | Record<string, unknown>[];
    update?: Record<string, unknown>;
    delete?: boolean;
  }
): Promise<{ data: T | null; error: Error | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `https://nvqnbnzbnzgpuckconte.supabase.co/rest/v1/${table}`;
  const headers: Record<string, string> = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52cW5ibnpibnpncHVja2NvbnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjUzOTEsImV4cCI6MjA4NjA0MTM5MX0.tfUPwSQoTxXLMsB_UEp23CTI17XGx_60iL3_2i-mlF0',
    'Content-Type': 'application/json',
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  try {
    let queryUrl = url;
    const params: string[] = [];
    
    if (options.select) params.push(`select=${encodeURIComponent(options.select)}`);
    if (options.eq) params.push(`${options.eq[0]}=eq.${options.eq[1]}`);
    if (options.in) params.push(`${options.in[0]}=in.(${options.in[1].join(',')})`);
    if (options.order) params.push(`order=${options.order[0]}.${options.order[1].ascending ? 'asc' : 'desc'}`);
    
    if (params.length) queryUrl += `?${params.join('&')}`;

    let method = 'GET';
    let body: string | undefined;

    if (options.insert) {
      method = 'POST';
      body = JSON.stringify(options.insert);
      headers['Prefer'] = 'return=representation';
    } else if (options.update) {
      method = 'PATCH';
      body = JSON.stringify(options.update);
      headers['Prefer'] = 'return=representation';
    } else if (options.delete) {
      method = 'DELETE';
    }

    const response = await fetch(queryUrl, { method, headers, body });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Query failed');
    }

    const data = options.delete ? null : await response.json();
    return { data: data as T, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export const useInvoices = (organizationId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['invoices', organizationId],
    queryFn: async (): Promise<Invoice[]> => {
      if (!organizationId) return [];
      
      const { data, error } = await queryTable<Invoice[]>('invoices', {
        select: '*',
        eq: ['organization_id', organizationId],
        order: ['created_at', { ascending: false }],
      });

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
      const { items, ...invoiceFields } = invoiceData;
      
      const { data: invoice, error: invoiceError } = await queryTable<Invoice[]>('invoices', {
        insert: invoiceFields,
      });

      if (invoiceError) throw invoiceError;
      const invoiceResult = Array.isArray(invoice) ? invoice[0] : invoice;
      if (!invoiceResult) throw new Error('Failed to create invoice');

      // Create invoice items
      if (items.length > 0) {
        const itemsWithInvoiceId = items.map(item => ({
          ...item,
          invoice_id: invoiceResult.id,
        }));

        const { error: itemsError } = await queryTable<InvoiceItem[]>('invoice_items', {
          insert: itemsWithInvoiceId,
        });

        if (itemsError) throw itemsError;
      }

      return invoiceResult;
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

      const { data, error } = await queryTable<Invoice[]>('invoices', {
        update: updateData,
        eq: ['id', invoiceId],
      });

      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
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
      const { error } = await queryTable<null>('invoices', {
        delete: true,
        eq: ['id', invoiceId],
      });

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
