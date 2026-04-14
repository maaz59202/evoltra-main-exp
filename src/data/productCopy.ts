export type PlanKey = 'solo' | 'team';

export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  priceLabel: string;
  monthlyPrice: number;
  period: string;
  description: string;
  landingFeatures: string[];
  pricingFeatures: PricingFeature[];
}

export const PLAN_DEFINITIONS: Record<PlanKey, PlanDefinition> = {
  solo: {
    key: 'solo',
    name: 'Solo',
    priceLabel: 'Free',
    monthlyPrice: 0,
    period: 'forever',
    description: 'A simple starting plan for solo freelancers',
    landingFeatures: [
      'Unlimited projects',
      '1 funnel',
      'Kanban board',
      'Client portal',
      'Basic analytics',
    ],
    pricingFeatures: [
      { text: 'Unlimited Projects', included: true },
      { text: '1 Funnel', included: true },
      { text: 'Kanban Board', included: true },
      { text: 'Client Portal', included: true },
      { text: 'Basic Analytics', included: true },
      { text: 'Team Members', included: false },
      { text: 'Priority Support', included: false },
      { text: 'Custom Branding', included: false },
    ],
  },
  team: {
    key: 'team',
    name: 'Team',
    priceLabel: '$29',
    monthlyPrice: 29,
    period: '/month',
    description: 'For agencies and teams managing work together',
    landingFeatures: [
      'Unlimited projects',
      'Unlimited funnels',
      'Unlimited team members',
      'Owner/Admin/Member roles',
      'Advanced analytics',
      'Priority support',
      'Custom branding',
    ],
    pricingFeatures: [
      { text: 'Unlimited Projects', included: true },
      { text: 'Unlimited Funnels', included: true },
      { text: 'Kanban Board', included: true },
      { text: 'Client Portal', included: true },
      { text: 'Advanced Analytics', included: true },
      { text: 'Unlimited Team Members', included: true },
      { text: 'Priority Support', included: true },
      { text: 'Custom Branding', included: true },
    ],
  },
};

export const TEAM_ROLES = [
  {
    role: 'owner',
    title: 'Owner',
    description: 'Full control, including billing and team management.',
    permissions: {
      viewProjects: true,
      manageProjects: true,
      viewFunnels: true,
      manageFunnels: true,
      viewLeads: true,
      manageClients: true,
      manageMembers: true,
      manageSettings: true,
      viewBilling: true,
      manageBilling: true,
      createInvoices: true,
      collaborate: true,
    },
  },
  {
    role: 'admin',
    title: 'Admin',
    description: 'Can manage projects, clients, invoices, and team access.',
    permissions: {
      viewProjects: true,
      manageProjects: true,
      viewFunnels: true,
      manageFunnels: true,
      viewLeads: true,
      manageClients: true,
      manageMembers: true,
      manageSettings: true,
      viewBilling: true,
      manageBilling: true,
      createInvoices: true,
      collaborate: true,
    },
  },
  {
    role: 'member',
    title: 'Member',
    description: 'Can view workspaces, projects, funnels, leads, tasks, and messages.',
    permissions: {
      viewProjects: true,
      manageProjects: false,
      viewFunnels: true,
      manageFunnels: false,
      viewLeads: true,
      manageClients: false,
      manageMembers: false,
      manageSettings: false,
      viewBilling: false,
      manageBilling: false,
      createInvoices: false,
      collaborate: true,
    },
  },
] as const;

export const ROLE_PERMISSIONS = Object.fromEntries(
  TEAM_ROLES.map((role) => [role.role, role.permissions])
) as Record<
  (typeof TEAM_ROLES)[number]['role'],
  (typeof TEAM_ROLES)[number]['permissions']
>;
