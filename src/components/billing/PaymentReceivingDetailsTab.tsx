import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Landmark, Smartphone, Globe2, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  PAYMENT_METHOD_OPTIONS,
  WALLET_PROVIDER_OPTIONS,
  buildPaymentReceivingDetails,
  defaultPaymentReceivingFormValues,
  getPaymentReceivingFormDefaults,
  paymentReceivingFormSchema,
  type PaymentReceivingFormValues,
} from '@/lib/payment-receiving';

type OrganizationPaymentSource = {
  id: string;
  payment_account_name?: string | null;
  payment_account_number?: string | null;
  payment_bank_name?: string | null;
  payment_link?: string | null;
  payment_receiving_details?: unknown;
};

interface PaymentReceivingDetailsTabProps {
  organization: OrganizationPaymentSource | null;
  canManageBilling: boolean;
  onSaved?: () => Promise<void> | void;
}

const methodIconMap = {
  international_bank_transfer: Globe2,
  pakistan_bank_transfer: Landmark,
  pakistan_mobile_wallet: Smartphone,
} as const;

const PaymentReceivingDetailsTab = ({
  organization,
  canManageBilling,
  onSaved,
}: PaymentReceivingDetailsTabProps) => {
  const form = useForm<PaymentReceivingFormValues>({
    resolver: zodResolver(paymentReceivingFormSchema),
    defaultValues: defaultPaymentReceivingFormValues,
  });
  const [isLoadingSavedDetails, setIsLoadingSavedDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingDetails, setIsDeletingDetails] = useState(false);

  const selectedMethod = form.watch('method');

  useEffect(() => {
    const loadDecryptedDetails = async () => {
      if (!organization?.id || !canManageBilling) {
        form.reset(getPaymentReceivingFormDefaults(organization));
        return;
      }

      setIsLoadingSavedDetails(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('You need to be signed in to load payment details.');
        }

        const { data: response, error } = await supabase.functions.invoke('get-payment-receiving-details', {
          body: { organizationId: organization.id },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;
        form.reset(getPaymentReceivingFormDefaults(response?.organization || organization));
      } catch (error) {
        console.error('Failed to load decrypted payment details:', error);
        form.reset(getPaymentReceivingFormDefaults(organization));
      } finally {
        setIsLoadingSavedDetails(false);
      }
    };

    void loadDecryptedDetails();
  }, [form, organization, canManageBilling]);

  const handleSubmit = async (values: PaymentReceivingFormValues) => {
    if (!organization?.id || !canManageBilling) return;

    const paymentReceivingDetails = buildPaymentReceivingDetails(values);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        throw new Error('You need to be signed in to save payment details.');
      }

      const { data: response, error } = await supabase.functions.invoke('set-payment-receiving-details', {
        body: {
          organizationId: organization.id,
          paymentReceivingDetails,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      const data = response?.organization;
      if (!data) {
        throw new Error('Payment receiving details could not be verified after save.');
      }

      const savedDetails = getPaymentReceivingFormDefaults(data);
      const attemptedDetails = getPaymentReceivingFormDefaults({
        payment_receiving_details: paymentReceivingDetails,
      });

      if (JSON.stringify(savedDetails) !== JSON.stringify(attemptedDetails)) {
        throw new Error('The payment details did not persist correctly. Please refresh and try again.');
      }

      await onSaved?.();
      form.reset(savedDetails);
      toast.success('Payment receiving details saved');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save payment receiving details';
      toast.error(message);
    }
  };

  const handleDeleteDetails = async () => {
    if (!organization?.id || !canManageBilling) return;

    try {
      setIsDeletingDetails(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        throw new Error('You need to be signed in to delete payment details.');
      }

      const { data: response, error } = await supabase.functions.invoke('set-payment-receiving-details', {
        body: {
          action: 'delete',
          organizationId: organization.id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      const clearedOrganization = response?.organization;
      if (
        !clearedOrganization ||
        clearedOrganization.payment_receiving_details ||
        clearedOrganization.payment_account_name ||
        clearedOrganization.payment_account_number ||
        clearedOrganization.payment_bank_name ||
        clearedOrganization.payment_link
      ) {
        throw new Error('Payment receiving details could not be fully removed. Please try again.');
      }

      await onSaved?.();
      form.reset(defaultPaymentReceivingFormValues);
      setShowDeleteDialog(false);
      toast.success('Payment receiving details deleted');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete payment receiving details';
      toast.error(message);
    } finally {
      setIsDeletingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/50">
        <CardHeader className="space-y-2">
          <CardTitle>Payment Receiving Details</CardTitle>
          <CardDescription>
            Keep one clean payment method on file. We use it in invoices and invoice emails so clients always see the right payout instructions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {PAYMENT_METHOD_OPTIONS.map((option) => {
              const Icon = methodIconMap[option.value];
              const active = selectedMethod === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => form.setValue('method', option.value, { shouldDirty: true, shouldValidate: true })}
                  className={`rounded-3xl border p-5 text-left transition ${
                    active
                      ? 'border-primary/60 bg-primary/10 shadow-[0_0_0_1px_rgba(124,92,255,0.28)]'
                      : 'border-border/60 bg-background/40 hover:border-primary/30 hover:bg-background/70'
                  }`}
                  disabled={!canManageBilling}
                >
                  <div className="mb-4 inline-flex rounded-2xl border border-border/60 bg-background/70 p-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="rounded-3xl border border-border/70 bg-background/35 p-6">
                <div className="mb-6 flex items-start gap-3">
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-2.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Client-facing payout instructions</p>
                    <p className="text-sm text-muted-foreground">
                      Only the fields for the selected payment method are shown on invoices and reminder emails.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="accountTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Evoltra LLC"
                            disabled={!canManageBilling}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedMethod === 'pakistan_mobile_wallet' ? (
                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wallet Provider</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!canManageBilling}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WALLET_PROVIDER_OPTIONS.map((provider) => (
                                <SelectItem key={provider.value} value={provider.value}>
                                  {provider.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={
                                selectedMethod === 'international_bank_transfer'
                                  ? 'e.g. HSBC UK'
                                  : 'e.g. Meezan Bank'
                              }
                              disabled={!canManageBilling}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedMethod === 'pakistan_bank_transfer' && (
                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Account number" disabled={!canManageBilling} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {(selectedMethod === 'international_bank_transfer' ||
                    selectedMethod === 'pakistan_bank_transfer') && (
                    <FormField
                      control={form.control}
                      name="iban"
                      render={({ field }) => (
                        <FormItem className={selectedMethod === 'pakistan_bank_transfer' ? '' : 'md:col-span-1'}>
                          <FormLabel>IBAN</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={
                                selectedMethod === 'pakistan_bank_transfer'
                                  ? 'PK36SCBL0000001123456702'
                                  : 'Enter full IBAN'
                              }
                              disabled={!canManageBilling}
                            />
                          </FormControl>
                          <FormDescription>
                            We normalize IBANs automatically, but validate them before save.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedMethod === 'international_bank_transfer' && (
                    <FormField
                      control={form.control}
                      name="swiftCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SWIFT / BIC</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. HBUKGB4B" disabled={!canManageBilling} />
                          </FormControl>
                          <FormDescription>
                            Standard BIC format is 8 or 11 characters.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedMethod === 'pakistan_mobile_wallet' && (
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wallet Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. +923001234567"
                              disabled={!canManageBilling}
                            />
                          </FormControl>
                          <FormDescription>
                            Stored in E.164 format for consistency.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={!canManageBilling || form.formState.isSubmitting || isLoadingSavedDetails || isDeletingDetails}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Receiving Details
                </Button>
                <Button type="submit" disabled={!canManageBilling || form.formState.isSubmitting || isLoadingSavedDetails}>
                  {form.formState.isSubmitting ? 'Saving...' : isLoadingSavedDetails ? 'Loading...' : 'Save Receiving Details'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment receiving details?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved payment method from Billing, invoices, and invoice reminder emails. We will clear both the encrypted payment payload and the fallback payment fields.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDetails}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteDetails();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingDetails}
            >
              {isDeletingDetails ? 'Deleting...' : 'Delete Details'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentReceivingDetailsTab;
