import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Evoltra subscription tiers
export const SUBSCRIPTION_TIERS = {
  team: {
    price_id: 'price_1SyBsrA7qSPD94rS3ffpPJON',
    product_id: 'prod_Tw40YMhRUderdj',
    name: 'Team',
    price: 29,
  },
} as const;

export interface SubscriptionStatus {
  subscribed: boolean;
  plan: 'solo' | 'team';
  productId: string | null;
  subscriptionEnd: string | null;
  cancelAtPeriodEnd: boolean;
  subscriptionStatus: string | null;
  loading: boolean;
  error: string | null;
}

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    plan: 'solo',
    productId: null,
    subscriptionEnd: null,
    cancelAtPeriodEnd: false,
    subscriptionStatus: null,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setStatus(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      setStatus(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // If the edge function fails, gracefully default to unsubscribed
      if (error || !data) {
        console.warn('Subscription check failed, defaulting to solo plan:', error);
        setStatus({
          subscribed: false,
          plan: 'solo',
          productId: null,
          subscriptionEnd: null,
          cancelAtPeriodEnd: false,
          subscriptionStatus: null,
          loading: false,
          error: null, // Don't surface this as a user-facing error
        });
        return;
      }

      setStatus({
        subscribed: !!data.subscribed,
        plan: data.plan || 'solo',
        productId: data.product_id ?? null,
        subscriptionEnd: data.subscription_end ?? null,
        cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
        subscriptionStatus: data.subscription_status ?? null,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.warn('Subscription check error, defaulting to solo plan:', err);
      setStatus({
        subscribed: false,
        plan: 'solo',
        productId: null,
        subscriptionEnd: null,
        cancelAtPeriodEnd: false,
        subscriptionStatus: null,
        loading: false,
        error: null, // Silently handle - don't break the UI
      });
    }
  }, [session?.access_token]);

  const createCheckout = async (priceId: string) => {
    if (!session?.access_token) {
      throw new Error('You must be logged in to subscribe');
    }

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      throw new Error('You must be logged in to manage subscription');
    }

    const { data, error } = await supabase.functions.invoke('customer-portal', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  };

  // Check subscription on mount and when user changes
  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setStatus({
        subscribed: false,
        plan: 'solo',
        productId: null,
        subscriptionEnd: null,
        cancelAtPeriodEnd: false,
        subscriptionStatus: null,
        loading: false,
        error: null,
      });
    }
  }, [user?.id, checkSubscription]);

  return {
    ...status,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    isTeam: status.plan === 'team',
    isSolo: status.plan === 'solo',
    isPendingDowngrade: status.plan === 'team' && status.cancelAtPeriodEnd,
  };
};
