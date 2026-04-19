import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, ExternalLink } from '@/components/ui/icons';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import easypaisaLogo from '@/assets/easypaisa-logo.jpeg';
import jazzcashLogo from '@/assets/jazzcash-logo.jpeg';

const PaymentMethodsTab = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [stripeActive, setStripeActive] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(true);

  useEffect(() => {
    const checkStripeState = async () => {
      if (!session?.access_token) {
        setStripeConfigured(false);
        setStripeActive(false);
        setStripeLoading(false);
        return;
      }

      setStripeLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          throw error;
        }

        const configured = data?.error !== 'stripe_not_configured';
        const active = !!data?.subscribed;

        setStripeConfigured(configured);
        setStripeActive(active);
      } catch (error) {
        console.error('Failed to check Stripe status:', error);
        setStripeConfigured(false);
        setStripeActive(false);
      } finally {
        setStripeLoading(false);
      }
    };

    void checkStripeState();
  }, [session?.access_token]);

  const stripeBadge = useMemo(() => {
    if (stripeLoading) {
      return { label: 'Checking', className: 'bg-muted text-muted-foreground hover:bg-muted' };
    }

    if (stripeActive) {
      return { label: 'Active', className: 'bg-green-500/10 text-green-600 hover:bg-green-500/20' };
    }

    if (stripeConfigured) {
      return { label: 'Available', className: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' };
    }

    return { label: 'Not Configured', className: 'bg-muted text-muted-foreground hover:bg-muted' };
  }, [stripeActive, stripeConfigured, stripeLoading]);

  const handleManageStripe = async () => {
    if (!stripeConfigured) {
      toast({
        title: 'Stripe not configured',
        description: 'Stripe has not been configured for this workspace yet.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: session?.access_token
          ? {
              Authorization: `Bearer ${session.access_token}`,
            }
          : undefined,
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not open billing portal',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Payment Methods</h3>
        <p className="text-sm text-muted-foreground">
          Manage your payment options for receiving client payments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className={stripeActive ? 'border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Stripe</CardTitle>
              </div>
              <Badge className={stripeBadge.className}>
                {stripeBadge.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              {stripeActive
                ? 'Stripe billing is active for this account.'
                : stripeConfigured
                  ? 'Stripe is available, but no active billing setup was found for this account.'
                  : 'Stripe has not been configured yet for this environment.'}
            </CardDescription>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={handleManageStripe}
              disabled={!stripeConfigured || stripeLoading}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {stripeActive ? 'Manage Billing' : stripeConfigured ? 'Open Stripe Portal' : 'Unavailable'}
            </Button>
          </CardContent>
        </Card>

        {/* EasyPaisa - Coming Soon */}
        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
                  <img src={easypaisaLogo} alt="EasyPaisa" className="h-10 w-10 object-contain" />
                </div>
                <CardTitle className="text-base">EasyPaisa</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-muted">
                Coming Soon
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Accept mobile wallet payments via EasyPaisa
            </CardDescription>
            <Button variant="outline" size="sm" className="w-full" disabled>
              Not Available
            </Button>
          </CardContent>
        </Card>

        {/* JazzCash - Coming Soon */}
        <Card className="opacity-60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
                  <img src={jazzcashLogo} alt="JazzCash" className="h-10 w-10 object-contain" />
                </div>
                <CardTitle className="text-base">JazzCash</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-muted">
                Coming Soon
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Accept mobile wallet payments via JazzCash
            </CardDescription>
            <Button variant="outline" size="sm" className="w-full" disabled>
              Not Available
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentMethodsTab;
