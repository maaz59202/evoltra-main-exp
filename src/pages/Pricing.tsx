import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/hooks/useSubscription';
import { PLAN_DEFINITIONS } from '@/data/productCopy';

import { 
  Check, 
  X, 
  Zap, 
  Users, 
  Loader2,
  CreditCard,
} from 'lucide-react';
import easypaisaLogo from '@/assets/easypaisa-logo.jpeg';
import jazzcashLogo from '@/assets/jazzcash-logo.jpeg';
import { useEffect } from 'react';
import { toast } from 'sonner';

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    plan: currentPlan, 
    loading: subscriptionLoading, 
    checkSubscription,
    createCheckout,
    waitForSubscriptionUpdate,
    isTeam 
  } = useSubscription();
  const [syncing, setSyncing] = useState(false);

  // Handle checkout callback (embedded return or redirect fallback)
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      searchParams.delete('checkout');
      searchParams.delete('session_id');
      setSearchParams(searchParams, { replace: true });
      // Trigger sync
      handlePostCheckout();
    } else if (checkoutStatus === 'cancelled') {
      toast.info('Checkout was cancelled.');
      searchParams.delete('checkout');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // Run once on mount

  const handlePostCheckout = async () => {
    setSyncing(true);
    toast.loading('Verifying your subscription...', { id: 'sub-sync' });
    
    const success = await waitForSubscriptionUpdate();
    
    if (success) {
      toast.success(`Welcome to ${PLAN_DEFINITIONS.team.name} plan! Your subscription is now active.`, { id: 'sub-sync' });
    } else {
      // Fallback: try one more direct check
      await checkSubscription();
      toast.info('Payment received! Your plan may take a moment to update.', { id: 'sub-sync' });
    }
    setSyncing(false);
  };

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/signup');
      return;
    }
    try {
      await createCheckout(SUBSCRIPTION_TIERS.team.price_id);
    } catch (err) {
      toast.error('Failed to start checkout. Please try again.');
    }
  };

  const plans = [
    {
      name: 'Solo',
      price: PLAN_DEFINITIONS.solo.monthlyPrice,
      period: PLAN_DEFINITIONS.solo.period,
      description: PLAN_DEFINITIONS.solo.description,
      icon: <Zap className="w-6 h-6" />,
      features: PLAN_DEFINITIONS.solo.pricingFeatures,
      cta: isTeam ? 'Downgrade' : (currentPlan === 'solo' ? 'Current Plan' : 'Get Started'),
      popular: false,
      isCurrent: currentPlan === 'solo' && !isTeam,
    },
    {
      name: 'Team',
      price: PLAN_DEFINITIONS.team.monthlyPrice,
      period: PLAN_DEFINITIONS.team.period,
      description: PLAN_DEFINITIONS.team.description,
      icon: <Users className="w-6 h-6" />,
      features: PLAN_DEFINITIONS.team.pricingFeatures,
      cta: isTeam ? 'Current Plan' : 'Upgrade Now',
      popular: true,
      isCurrent: isTeam,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="secondary" className="mb-4">
              Simple Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Choose Your <span className="gradient-text">Plan</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Start free and scale as you grow. No hidden fees, cancel anytime.
            </p>
          </div>

          {/* Syncing overlay */}
          {syncing && (
            <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-lg font-medium">Verifying your subscription...</p>
                <p className="text-sm text-muted-foreground">This usually takes a few seconds</p>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {plans.map((plan) => (
              <Card 
                key={plan.name}
                className={`glass-card relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  plan.popular ? 'border-primary ring-2 ring-primary/20' : ''
                } ${plan.isCurrent ? 'border-success ring-2 ring-success/20' : ''}`}
              >
                {plan.popular && !plan.isCurrent && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg gradient-primary text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {plan.isCurrent && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-success text-white">
                      Your Plan
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-8">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center text-white mb-4">
                    {plan.icon}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-success flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={feature.included ? '' : 'text-muted-foreground'}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  {plan.name === PLAN_DEFINITIONS.solo.name ? (
                    plan.isCurrent ? (
                      <Button className="w-full" variant="outline" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button className="w-full" variant="outline" asChild>
                        <Link to={user ? '/dashboard' : '/signup'}>
                          {plan.cta}
                        </Link>
                      </Button>
                    )
                  ) : (
                    plan.isCurrent ? (
                      <Button className="w-full" variant="outline" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button 
                        className="w-full gradient-primary text-white"
                        onClick={handleSubscribe}
                        disabled={subscriptionLoading || syncing}
                      >
                        {plan.cta}
                      </Button>
                    )
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payment Methods */}
          <div className="max-w-2xl mx-auto">
            <h3 className="text-center text-lg font-semibold mb-6">Payment Methods</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#635BFF] flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Stripe</p>
                    <p className="text-xs text-success">Active</p>
                  </div>
                </div>
              </Card>
              <Card className="glass-card p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={easypaisaLogo} alt="EasyPaisa" className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <p className="font-medium">EasyPaisa</p>
                    <p className="text-xs text-muted-foreground">Coming Soon</p>
                  </div>
                </div>
              </Card>
              <Card className="glass-card p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={jazzcashLogo} alt="JazzCash" className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <p className="font-medium">JazzCash</p>
                    <p className="text-xs text-muted-foreground">Coming Soon</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* FAQ Teaser */}
          <div className="text-center mt-16">
            <p className="text-muted-foreground">
              Have questions?{' '}
              <Link to="/docs" className="text-primary hover:underline">
                Check our documentation
              </Link>{' '}
              or{' '}
              <a href="mailto:support@evoltra.com" className="text-primary hover:underline">
                contact support
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />

    </div>
  );
};

export default Pricing;

