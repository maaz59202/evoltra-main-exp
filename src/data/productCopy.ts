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
    description: 'Perfect for freelancers starting out',
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
    description: 'For growing agencies and teams',
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
  },
  {
    role: 'admin',
    title: 'Admin',
    description: 'Can manage projects, members, and workspace settings.',
  },
  {
    role: 'member',
    title: 'Member',
    description: 'Can collaborate on projects and tasks.',
  },
] as const;
