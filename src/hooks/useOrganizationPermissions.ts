import { useMemo } from 'react';
import { ROLE_PERMISSIONS } from '@/data/productCopy';
import { useProjects } from '@/hooks/useProjects';

export type OrganizationRole = 'owner' | 'admin' | 'member';

const DEFAULT_PERMISSIONS = {
  viewProjects: false,
  manageProjects: false,
  viewFunnels: false,
  manageFunnels: false,
  viewLeads: false,
  manageClients: false,
  manageMembers: false,
  manageSettings: false,
  viewBilling: false,
  manageBilling: false,
  createInvoices: false,
  collaborate: false,
};

export const useOrganizationPermissions = (organizationId?: string | null) => {
  const { organizations, selectedOrgId } = useProjects();

  const effectiveOrganizationId = organizationId ?? selectedOrgId ?? null;

  const currentOrganization = useMemo(
    () => organizations.find((organization) => organization.id === effectiveOrganizationId) || null,
    [effectiveOrganizationId, organizations]
  );

  const role = (currentOrganization?.role as OrganizationRole | undefined) || null;
  const permissions = role ? ROLE_PERMISSIONS[role] : DEFAULT_PERMISSIONS;

  return {
    organization: currentOrganization,
    role,
    permissions,
  };
};
