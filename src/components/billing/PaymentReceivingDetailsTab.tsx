import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Landmark, Smartphone, Globe2, Trash2, Eye, EyeOff } from '@/components/ui/icons';
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
  parsePaymentReceivingDetailsCollection,
  paymentReceivingFormSchema,
  removePaymentReceivingMethod,
  upsertPaymentReceivingMethod,
  type PaymentReceivingMethod,
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

const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'pakistan_bank_transfer';

const methodIconMap = {
  international_bank_transfer: Globe2,
  pakistan_bank_transfer: Landmark,
  pakistan_mobile_wallet: Smartphone,
} as const;

const fetchLatestSavedMethods = async (organizationId: string, accessToken: string) => {
  const { data: response, error } = await supabase.functions.invoke('get-payment-receiving-details', {
    body: { organizationId },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) throw error;

  const source = response?.organization;
  return {
    source,
    methods: parsePaymentReceivingDetailsCollection(source),
  };
};

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
  const [showSensitiveDetails, setShowSensitiveDetails] = useState(false);
  const [savedMethods, setSavedMethods] = useState<PaymentReceivingMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);

  const selectMethod = (method: PaymentMethod, methods: PaymentReceivingMethod[] = savedMethods, source?: OrganizationPaymentSource | null) => {
    setSelectedMethod(method);
    form.reset(
      getPaymentReceivingFormDefaults(
        source ?? { payment_receiving_details: { methods } },
        method,
      ),
    );
  };

  useEffect(() => {
    const loadDecryptedDetails = async () => {
      if (!organization?.id || !canManageBilling) {
        const methods = parsePaymentReceivingDetailsCollection(organization);
        setSavedMethods(methods);
        selectMethod(methods[0]?.method ?? DEFAULT_PAYMENT_METHOD, methods, organization);
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
        const source = response?.organization || organization;
        const methods = parsePaymentReceivingDetailsCollection(source);
        setSavedMethods(methods);
        selectMethod(methods[0]?.method ?? DEFAULT_PAYMENT_METHOD, methods, source);
      } catch (error) {
        console.error('Failed to load decrypted payment details:', error);
        const methods = parsePaymentReceivingDetailsCollection(organization);
        setSavedMethods(methods);
        selectMethod(methods[0]?.method ?? DEFAULT_PAYMENT_METHOD, methods, organization);
      } finally {
        setIsLoadingSavedDetails(false);
      }
    };

    void loadDecryptedDetails();
  }, [form, organization, canManageBilling]);

  const handleSubmit = async (values: PaymentReceivingFormValues) => {
    if (!organization?.id || !canManageBilling) return;

    const nextMethod = buildPaymentReceivingDetails(values);

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

      const { methods: latestSavedMethods } = await fetchLatestSavedMethods(
        organization.id,
        session.access_token,
      );

      const paymentReceivingDetails = upsertPaymentReceivingMethod(latestSavedMethods, nextMethod);

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

      const persistedMethods = parsePaymentReceivingDetailsCollection(data);
      const attemptedMethods = paymentReceivingDetails.methods;

      if (JSON.stringify(persistedMethods) !== JSON.stringify(attemptedMethods)) {
        throw new Error('The payment details did not persist correctly. Please refresh and try again.');
      }

      await onSaved?.();
      setSavedMethods(persistedMethods);
      selectMethod(nextMethod.method, persistedMethods, data);
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

      const { methods: latestSavedMethods } = await fetchLatestSavedMethods(
        organization.id,
        session.access_token,
      );

      const hasSavedSelectedMethod = latestSavedMethods.some((method) => method.method === selectedMethod);
      if (!hasSavedSelectedMethod) {
        selectMethod(selectedMethod, []);
        setShowDeleteDialog(false);
        toast.success('Unsaved payment fields cleared');
        return;
      }

      const remainingMethods = removePaymentReceivingMethod(latestSavedMethods, selectedMethod).methods;
      if (remainingMethods.length === 0) {
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
        setSavedMethods([]);
        setSelectedMethod(DEFAULT_PAYMENT_METHOD);
        form.reset(defaultPaymentReceivingFormValues);
      } else {
        const { data: response, error } = await supabase.functions.invoke('set-payment-receiving-details', {
          body: {
            organizationId: organization.id,
            paymentReceivingDetails: { methods: remainingMethods },
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;

        const persistedMethods = parsePaymentReceivingDetailsCollection(response?.organization);
        await onSaved?.();
        setSavedMethods(persistedMethods);
        selectMethod(persistedMethods[0]?.method ?? DEFAULT_PAYMENT_METHOD, persistedMethods);
      }

      setShowDeleteDialog(false);
      toast.success('Payment receiving details updated');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete payment receiving details';
      toast.error(message);
    } finally {
      setIsDeletingDetails(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/60 bg-card/35 shadow-none">
          <CardHeader className="space-y-2">
            <CardTitle>Payment Receiving Details</CardTitle>
            <CardDescription>
              Keep one or more receiving methods on file. These instructions are shown on invoices inside the client portal so clients know how to pay you.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
          {!!savedMethods.length && (
            <div className="flex flex-wrap gap-2">
              {savedMethods.map((method) => {
                const active = selectedMethod === method.method;
                const label = PAYMENT_METHOD_OPTIONS.find((option) => option.value === method.method)?.label || method.method;
                return (
                  <Button
                    key={method.method}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 rounded-full"
                    onClick={() => selectMethod(method.method)}
                    disabled={!canManageBilling}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-3">
            {PAYMENT_METHOD_OPTIONS.map((option) => {
              const Icon = methodIconMap[option.value];
              const active = selectedMethod === option.value;
              const isSaved = savedMethods.some((method) => method.method === option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectMethod(option.value)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? 'border-primary/60 bg-primary/10 shadow-[0_0_0_1px_rgba(124,92,255,0.28)]'
                      : 'border-border/60 bg-background/40 hover:border-primary/30 hover:bg-background/70'
                  }`}
                  disabled={!canManageBilling}
                >
                  <div className="mb-3 inline-flex rounded-xl border border-border/60 bg-background/70 p-2.5">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-medium">
                      {option.label}
                      {isSaved ? <span className="ml-2 text-xs text-primary">Saved</span> : null}
                    </p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => setShowSensitiveDetails((current) => !current)}
                    disabled={!canManageBilling || isLoadingSavedDetails}
                  >
                    {showSensitiveDetails ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Hide sensitive fields
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Show sensitive fields
                      </>
                    )}
                  </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                      key="provider"
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
                      key={`bankName-${selectedMethod}`}
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
                      key="accountNumber"
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type={showSensitiveDetails ? 'text' : 'password'}
                              autoComplete="off"
                              placeholder="Account number"
                              disabled={!canManageBilling}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {(selectedMethod === 'international_bank_transfer' ||
                    selectedMethod === 'pakistan_bank_transfer') && (
                    <FormField
                      key={`iban-${selectedMethod}`}
                      control={form.control}
                      name="iban"
                      render={({ field }) => (
                        <FormItem className={selectedMethod === 'pakistan_bank_transfer' ? '' : 'md:col-span-1'}>
                          <FormLabel>IBAN</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type={showSensitiveDetails ? 'text' : 'password'}
                              autoComplete="off"
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
                      key="swiftCode"
                      control={form.control}
                      name="swiftCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SWIFT / BIC</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type={showSensitiveDetails ? 'text' : 'password'}
                              autoComplete="off"
                              placeholder="e.g. HBUKGB4B"
                              disabled={!canManageBilling}
                            />
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
                      key="phoneNumber"
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wallet Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type={showSensitiveDetails ? 'text' : 'password'}
                              autoComplete="off"
                              placeholder="e.g. +923001234567"
                              disabled={!canManageBilling}
                            />
                          </FormControl>
                          {/* <FormDescription>
                            Stored in E.164 format for consistency.
                          </FormDescription> */}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={
                    !canManageBilling ||
                    form.formState.isSubmitting ||
                    isLoadingSavedDetails ||
                    isDeletingDetails ||
                    (!savedMethods.some((method) => method.method === selectedMethod) && !form.formState.isDirty)
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected Method
                </Button>
                <Button className="h-9 rounded-lg px-4" type="submit" disabled={!canManageBilling || form.formState.isSubmitting || isLoadingSavedDetails}>
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
