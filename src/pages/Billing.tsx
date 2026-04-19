import { Spinner } from '@/components/ui/spinner';
import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Landmark } from '@/components/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjects } from '@/hooks/useProjects';
import InvoicesTab from '@/components/billing/InvoicesTab';
import PaymentReceivingDetailsTab from '@/components/billing/PaymentReceivingDetailsTab';

const Billing = () => {
  const { organizations, selectedOrgId, organizationsLoaded, refetch } = useProjects();
  const billingOrganizations = useMemo(
    () => organizations.filter((organization) => ['owner', 'admin'].includes(organization.role || '')),
    [organizations],
  );
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationsLoaded) return;

    const selectedBillingOrg =
      selectedOrgId && billingOrganizations.some((organization) => organization.id === selectedOrgId)
        ? selectedOrgId
        : null;

    if (selectedBillingOrg) {
      setOrganizationId(selectedBillingOrg);
      return;
    }

    if (billingOrganizations.length === 1) {
      setOrganizationId(billingOrganizations[0].id);
      return;
    }

    setOrganizationId((current) =>
      current && billingOrganizations.some((organization) => organization.id === current) ? current : null,
    );
  }, [billingOrganizations, organizationsLoaded, selectedOrgId]);

  const selectedOrganization =
    billingOrganizations.find((organization) => organization.id === organizationId) || null;
  const canViewBilling = !!selectedOrganization?.role && ['owner', 'admin'].includes(selectedOrganization.role);
  const canManageBilling = !!selectedOrganization?.role && ['owner', 'admin'].includes(selectedOrganization.role);

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5">
      <div className="space-y-2">
        <h1 className="text-[2rem] font-semibold tracking-tight">Billing</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Manage invoices and the receiving details clients should use when they pay you.
        </p>
      </div>

      {!organizationsLoaded ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : billingOrganizations.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
          <p>Billing is only available to workspace owners and admins.</p>
        </div>
      ) : !organizationId ? (
        <div className="space-y-5">
          <div className="max-w-sm space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
            <Select value={organizationId ?? undefined} onValueChange={setOrganizationId}>
              <SelectTrigger className="h-10 rounded-lg border-border/60 bg-background">
                <SelectValue placeholder="Select a workspace" />
              </SelectTrigger>
              <SelectContent>
                {billingOrganizations.map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 text-muted-foreground">
            <p>Select a workspace before creating invoices or managing payment details.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
        <div className="max-w-sm space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
          <Select value={organizationId} onValueChange={setOrganizationId}>
            <SelectTrigger className="h-10 rounded-lg border-border/60 bg-background">
              <SelectValue placeholder="Select a workspace" />
            </SelectTrigger>
            <SelectContent>
              {billingOrganizations.map((organization) => (
                <SelectItem key={organization.id} value={organization.id}>
                  {organization.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="receiving" className="space-y-5">
          <TabsList className="grid h-10 w-full max-w-md grid-cols-2 rounded-lg border border-border/60 bg-background/40 p-1">
            <TabsTrigger value="receiving" className="gap-2">
              <Landmark className="h-4 w-4" />
              Receiving Details
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <FileText className="h-4 w-4" />
              Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="receiving">
            <PaymentReceivingDetailsTab
              organization={selectedOrganization}
              canManageBilling={canManageBilling}
              onSaved={refetch}
            />
          </TabsContent>

          <TabsContent value="invoices">
            <InvoicesTab organizationId={organizationId} canManageBilling={canManageBilling} />
          </TabsContent>
        </Tabs>
        </div>
      )}
    </div>
  );
};

export default Billing;
