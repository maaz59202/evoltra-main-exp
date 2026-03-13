import { useCallback, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe('pk_test_51SiygpA7qSPD94rSMywDo3R0ievzW1sVpaG1BnZZ4BnFMlHova8uETbtoCnQYil8dcMjQdU2dTOAcuuO36PEXxbI00fUZ0LQ2N');

interface StripeCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceId: string;
  onComplete: () => void;
}

const StripeCheckoutModal = ({ open, onOpenChange, priceId, onComplete }: StripeCheckoutModalProps) => {
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    if (!session?.access_token) throw new Error('Not authenticated');
    
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId, embedded: true },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data.clientSecret;
  }, [priceId, session?.access_token]);

  const handleComplete = useCallback(() => {
    onComplete();
    onOpenChange(false);
  }, [onComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Complete Your Subscription</DialogTitle>
        </DialogHeader>
        <div className="p-6 pt-4 min-h-[400px]">
          {error ? (
            <div className="text-center text-destructive py-8">
              <p>{error}</p>
            </div>
          ) : (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret, onComplete: handleComplete }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StripeCheckoutModal;
