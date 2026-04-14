import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CreditCard, Landmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import InvoicesTab from '@/components/billing/InvoicesTab';
import PaymentMethodsTab from '@/components/billing/PaymentMethodsTab';
import PaymentReceivingDetailsTab from '@/components/billing/PaymentReceivingDetailsTab';

const Billing = () => {
  const { user } = useAuth();
  const { organizations, selectedOrgId, refetch } = useProjects();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const selectedOrganization =
    organizations.find((organization) => organization.id === (selectedOrgId || organizationId)) || null;
  const canViewBilling = !!selectedOrganization?.role && ['owner', 'admin'].includes(selectedOrganization.role);
  const canManageBilling = !!selectedOrganization?.role && ['owner', 'admin'].includes(selectedOrganization.role);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setOrganizationId(data?.organization_id || null);
      } catch (error) {
        console.error('Error fetching organization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="mt-2 text-muted-foreground">
          Manage invoices, payment methods, and clean payout instructions for your organization.
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !organizationId ? (
        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
          <p>You need to be part of an organization to access billing.</p>
        </div>
      ) : !canViewBilling ? (
        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
          <p>Billing is only available to workspace owners and admins.</p>
        </div>
      ) : (
        <div className="space-y-6">
        <Tabs defaultValue="invoices" className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="h-4 w-4" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Methods
            </TabsTrigger>
            <TabsTrigger value="receiving" className="gap-2">
              <Landmark className="h-4 w-4" />
              Receiving Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <InvoicesTab organizationId={organizationId} canManageBilling={canManageBilling} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentMethodsTab />
          </TabsContent>

          <TabsContent value="receiving">
            <PaymentReceivingDetailsTab
              organization={selectedOrganization}
              canManageBilling={canManageBilling}
              onSaved={refetch}
            />
          </TabsContent>
        </Tabs>
        </div>
      )}
    </div>
  );
};

export default Billing;
