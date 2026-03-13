import { Widget } from '@/types/funnel';

export interface FunnelTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  widgets: Widget[];
}

const uid = () => crypto.randomUUID();

export const funnelTemplates: FunnelTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch with an empty canvas',
    icon: 'FileText',
    widgets: [],
  },
  {
    id: 'hero',
    name: 'Hero Page',
    description: 'Bold headline with a call-to-action button',
    icon: 'Sparkles',
    widgets: (() => {
      const sectionId = uid();
      return [
        {
          id: sectionId,
          type: 'section' as const,
          order: 0,
          parentId: null,
          props: {
            backgroundType: 'gradient' as const,
            backgroundColor: '#1e293b',
            gradientFrom: '#1e293b',
            gradientTo: '#334155',
            paddingY: 80,
          },
        },
        {
          id: uid(),
          type: 'heading' as const,
          order: 0,
          parentId: sectionId,
          props: {
            content: 'Transform Your Business Today',
            level: 'h1' as const,
            fontSize: 48,
            color: '#ffffff',
            alignment: 'center' as const,
          },
        },
        {
          id: uid(),
          type: 'text' as const,
          order: 1,
          parentId: sectionId,
          props: {
            content: 'Discover the tools and strategies that will take your business to the next level. Join thousands of satisfied customers.',
            fontSize: 18,
            fontWeight: 'normal' as const,
            color: '#94a3b8',
            alignment: 'center' as const,
          },
        },
        {
          id: uid(),
          type: 'spacer' as const,
          order: 2,
          parentId: sectionId,
          props: { height: 24 },
        },
        {
          id: uid(),
          type: 'button' as const,
          order: 3,
          parentId: sectionId,
          props: {
            text: 'Get Started Now',
            url: '#',
            variant: 'primary' as const,
            backgroundColor: '#3b82f6',
            textColor: '#ffffff',
          },
        },
      ];
    })(),
  },
  {
    id: 'lead-capture',
    name: 'Lead Capture',
    description: 'Collect emails with a form and compelling copy',
    icon: 'UserPlus',
    widgets: (() => {
      const sectionId = uid();
      return [
        {
          id: sectionId,
          type: 'section' as const,
          order: 0,
          parentId: null,
          props: {
            backgroundType: 'solid' as const,
            backgroundColor: '#f8fafc',
            paddingY: 64,
          },
        },
        {
          id: uid(),
          type: 'heading' as const,
          order: 0,
          parentId: sectionId,
          props: {
            content: 'Get Your Free Guide',
            level: 'h1' as const,
            fontSize: 40,
            color: '#0f172a',
            alignment: 'center' as const,
          },
        },
        {
          id: uid(),
          type: 'text' as const,
          order: 1,
          parentId: sectionId,
          props: {
            content: 'Enter your email below and we\'ll send you our exclusive guide — packed with actionable tips to grow your business.',
            fontSize: 16,
            fontWeight: 'normal' as const,
            color: '#475569',
            alignment: 'center' as const,
          },
        },
        {
          id: uid(),
          type: 'spacer' as const,
          order: 2,
          parentId: sectionId,
          props: { height: 24 },
        },
        {
          id: uid(),
          type: 'input' as const,
          order: 3,
          parentId: sectionId,
          props: {
            inputType: 'email' as const,
            placeholder: 'you@example.com',
            required: true,
            label: 'Email Address',
          },
        },
        {
          id: uid(),
          type: 'button' as const,
          order: 4,
          parentId: sectionId,
          props: {
            text: 'Download Now',
            url: '#',
            variant: 'primary' as const,
            backgroundColor: '#10b981',
            textColor: '#ffffff',
          },
        },
      ];
    })(),
  },
  {
    id: 'cta',
    name: 'CTA Section',
    description: 'A focused call-to-action with urgency',
    icon: 'Megaphone',
    widgets: (() => {
      const sectionId = uid();
      return [
        {
          id: sectionId,
          type: 'section' as const,
          order: 0,
          parentId: null,
          props: {
            backgroundType: 'gradient' as const,
            backgroundColor: '#7c3aed',
            gradientFrom: '#7c3aed',
            gradientTo: '#4f46e5',
            paddingY: 64,
          },
        },
        {
          id: uid(),
          type: 'heading' as const,
          order: 0,
          parentId: sectionId,
          props: {
            content: 'Limited Time Offer — 50% Off',
            level: 'h2' as const,
            fontSize: 36,
            color: '#ffffff',
            alignment: 'center' as const,
          },
        },
        {
          id: uid(),
          type: 'text' as const,
          order: 1,
          parentId: sectionId,
          props: {
            content: 'Don\'t miss out on this exclusive deal. Sign up today and save big on our premium plan.',
            fontSize: 18,
            fontWeight: 'normal' as const,
            color: '#e0e7ff',
            alignment: 'center' as const,
          },
        },
        {
          id: uid(),
          type: 'spacer' as const,
          order: 2,
          parentId: sectionId,
          props: { height: 20 },
        },
        {
          id: uid(),
          type: 'button' as const,
          order: 3,
          parentId: sectionId,
          props: {
            text: 'Claim Your Discount',
            url: '#',
            variant: 'primary' as const,
            backgroundColor: '#f59e0b',
            textColor: '#000000',
          },
        },
      ];
    })(),
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    description: 'Confirmation page after sign-up or purchase',
    icon: 'PartyPopper',
    widgets: (() => {
      const sectionId = uid();
      return [
        {
          id: sectionId,
          type: 'section' as const,
          order: 0,
          parentId: null,
          props: {
            backgroundType: 'solid' as const,
            backgroundColor: '#ffffff',
            paddingY: 80,
          },
        },
        {
          id: uid(),
          type: 'heading' as const,
          order: 0,
          parentId: sectionId,
          props: {
            content: '🎉 Thank You!',
            level: 'h1' as const,
            fontSize: 44,
            color: '#0f172a',
            alignment: 'center' as const,
          },
        },
        {
          id: uid(),
          type: 'text' as const,
          order: 1,
          parentId: sectionId,
          props: {
            content: 'Your submission has been received. Check your inbox for the next steps. We\'re excited to have you on board!',
            fontSize: 18,
            fontWeight: 'normal' as const,
            color: '#475569',
            alignment: 'center' as const,
          },
        },
        {
          id: uid(),
          type: 'spacer' as const,
          order: 2,
          parentId: sectionId,
          props: { height: 24 },
        },
        {
          id: uid(),
          type: 'button' as const,
          order: 3,
          parentId: sectionId,
          props: {
            text: 'Go to Dashboard',
            url: '#',
            variant: 'primary' as const,
            backgroundColor: '#3b82f6',
            textColor: '#ffffff',
          },
        },
      ];
    })(),
  },
];
