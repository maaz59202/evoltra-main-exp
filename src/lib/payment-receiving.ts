import { z } from 'zod';

export const PAYMENT_METHOD_OPTIONS = [
  {
    value: 'international_bank_transfer',
    label: 'International Bank Transfer',
    description: 'Use IBAN and SWIFT/BIC for cross-border bank payments.',
  },
  {
    value: 'pakistan_bank_transfer',
    label: 'Pakistan Bank Transfer',
    description: 'Use local bank account details with Pakistan IBAN.',
  },
  {
    value: 'pakistan_mobile_wallet',
    label: 'Pakistan Mobile Wallet',
    description: 'Use Easypaisa or JazzCash wallet details.',
  },
] as const;

export const WALLET_PROVIDER_OPTIONS = [
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'jazzcash', label: 'JazzCash' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHOD_OPTIONS)[number]['value'];
export type WalletProvider = (typeof WALLET_PROVIDER_OPTIONS)[number]['value'];

export type PaymentReceivingMethod =
  | {
      method: 'international_bank_transfer';
      accountTitle: string;
      bankName: string;
      iban: string;
      swiftCode: string;
    }
  | {
      method: 'pakistan_bank_transfer';
      accountTitle: string;
      bankName: string;
      accountNumber: string;
      iban: string;
    }
  | {
      method: 'pakistan_mobile_wallet';
      accountTitle: string;
      provider: WalletProvider;
      phoneNumber: string;
    };

export type PaymentReceivingDetailsPayload = {
  methods: PaymentReceivingMethod[];
};

export type PaymentReceivingFormValues = {
  method: PaymentMethod;
  accountTitle: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  provider: WalletProvider;
  phoneNumber: string;
};

type LegacyPaymentFields = {
  payment_account_name?: string | null;
  payment_account_number?: string | null;
  payment_bank_name?: string | null;
  payment_link?: string | null;
  payment_receiving_details?: unknown;
};

const normalizeIban = (value: string) => value.replace(/\s+/g, '').toUpperCase();
const normalizeSwift = (value: string) => value.replace(/\s+/g, '').toUpperCase();

export const isValidIban = (value: string) => {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(iban)) {
    return false;
  }

  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;

  for (const character of rearranged) {
    const numeric = /[A-Z]/.test(character)
      ? String(character.charCodeAt(0) - 55)
      : character;

    for (const digit of numeric) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }

  return remainder === 1;
};

export const normalizePkPhoneNumber = (value: string) => {
  const digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+92')) {
    return `+92${digits.slice(3).replace(/\D/g, '')}`;
  }
  const numeric = digits.replace(/\D/g, '');

  if (numeric.startsWith('92')) {
    return `+${numeric}`;
  }

  if (numeric.startsWith('03')) {
    return `+92${numeric.slice(1)}`;
  }

  if (numeric.startsWith('3')) {
    return `+92${numeric}`;
  }

  return value.trim();
};

const isValidPkPhoneNumber = (value: string) => /^\+923\d{9}$/.test(normalizePkPhoneNumber(value));
const isValidSwiftCode = (value: string) => /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalizeSwift(value));
const isValidPkAccountNumber = (value: string) => /^[A-Z0-9-]{6,24}$/i.test(value.trim());

export const paymentReceivingFormSchema = z
  .object({
    method: z.enum([
      'international_bank_transfer',
      'pakistan_bank_transfer',
      'pakistan_mobile_wallet',
    ]),
    accountTitle: z.string().trim(),
    bankName: z.string().trim(),
    accountNumber: z.string().trim(),
    iban: z.string().trim(),
    swiftCode: z.string().trim(),
    provider: z.enum(['easypaisa', 'jazzcash']),
    phoneNumber: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (!value.accountTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Account title is required.',
        path: ['accountTitle'],
      });
    }

    if (value.method === 'international_bank_transfer') {
      if (!value.bankName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bank name is required.',
          path: ['bankName'],
        });
      }
      if (!value.iban) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'IBAN is required.',
          path: ['iban'],
        });
      } else if (!isValidIban(value.iban)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid IBAN.',
          path: ['iban'],
        });
      }
      if (!value.swiftCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SWIFT / BIC is required.',
          path: ['swiftCode'],
        });
      } else if (!isValidSwiftCode(value.swiftCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid SWIFT / BIC code.',
          path: ['swiftCode'],
        });
      }
    }

    if (value.method === 'pakistan_bank_transfer') {
      if (!value.bankName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bank name is required.',
          path: ['bankName'],
        });
      }
      if (!value.accountNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Account number is required.',
          path: ['accountNumber'],
        });
      } else if (!isValidPkAccountNumber(value.accountNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid account number.',
          path: ['accountNumber'],
        });
      }
      if (!value.iban) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Pakistan IBAN is required.',
          path: ['iban'],
        });
      } else if (!isValidIban(value.iban) || !normalizeIban(value.iban).startsWith('PK') || normalizeIban(value.iban).length !== 24) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid Pakistan IBAN.',
          path: ['iban'],
        });
      }
    }

    if (value.method === 'pakistan_mobile_wallet') {
      if (!value.phoneNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Wallet phone number is required.',
          path: ['phoneNumber'],
        });
      } else if (!isValidPkPhoneNumber(value.phoneNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid Pakistan mobile number.',
          path: ['phoneNumber'],
        });
      }
    }
  });

export const defaultPaymentReceivingFormValues: PaymentReceivingFormValues = {
  method: 'pakistan_bank_transfer',
  accountTitle: '',
  bankName: '',
  accountNumber: '',
  iban: '',
  swiftCode: '',
  provider: 'easypaisa',
  phoneNumber: '',
};

const parsePaymentReceivingMethod = (candidate: Record<string, unknown>): PaymentReceivingMethod | null => {
  const method = candidate.method;
  if (method === 'international_bank_transfer') {
    const accountTitle = typeof candidate.accountTitle === 'string' ? candidate.accountTitle : '';
    const bankName = typeof candidate.bankName === 'string' ? candidate.bankName : '';
    const iban = typeof candidate.iban === 'string' ? candidate.iban : '';
    const swiftCode = typeof candidate.swiftCode === 'string' ? candidate.swiftCode : '';
    if (accountTitle && bankName && iban && swiftCode) {
      return {
        method,
        accountTitle,
        bankName,
        iban,
        swiftCode,
      };
    }
  }

  if (method === 'pakistan_bank_transfer') {
    const accountTitle = typeof candidate.accountTitle === 'string' ? candidate.accountTitle : '';
    const bankName = typeof candidate.bankName === 'string' ? candidate.bankName : '';
    const accountNumber = typeof candidate.accountNumber === 'string' ? candidate.accountNumber : '';
    const iban = typeof candidate.iban === 'string' ? candidate.iban : '';
    if (accountTitle && bankName && accountNumber && iban) {
      return {
        method,
        accountTitle,
        bankName,
        accountNumber,
        iban,
      };
    }
  }

  if (method === 'pakistan_mobile_wallet') {
    const accountTitle = typeof candidate.accountTitle === 'string' ? candidate.accountTitle : '';
    const provider =
      candidate.provider === 'easypaisa' || candidate.provider === 'jazzcash'
        ? candidate.provider
        : null;
    const phoneNumber = typeof candidate.phoneNumber === 'string' ? candidate.phoneNumber : '';
    if (accountTitle && provider && phoneNumber) {
      return {
        method,
        accountTitle,
        provider,
        phoneNumber,
      };
    }
  }

  return null;
};

export const parsePaymentReceivingDetailsCollection = (
  source?: LegacyPaymentFields | null,
): PaymentReceivingMethod[] => {
  const payload = source?.payment_receiving_details;
  const methods: PaymentReceivingMethod[] = [];

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload)) {
      payload.forEach((entry) => {
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          const parsed = parsePaymentReceivingMethod(entry as Record<string, unknown>);
          if (parsed && !methods.some((method) => method.method === parsed.method)) {
            methods.push(parsed);
          }
        }
      });
    } else {
      const candidate = payload as Record<string, unknown>;
      if (Array.isArray(candidate.methods)) {
        candidate.methods.forEach((entry) => {
          if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            const parsed = parsePaymentReceivingMethod(entry as Record<string, unknown>);
            if (parsed && !methods.some((method) => method.method === parsed.method)) {
              methods.push(parsed);
            }
          }
        });
      } else {
        const parsed = parsePaymentReceivingMethod(candidate);
        if (parsed) {
          methods.push(parsed);
        }
      }
    }
  }

  return methods;
};

export const getPaymentReceivingFormDefaults = (
  source?: LegacyPaymentFields | null,
  preferredMethod?: PaymentMethod | null,
): PaymentReceivingFormValues => {
  const storedMethods = parsePaymentReceivingDetailsCollection(source);
  const preferredStoredMethod = preferredMethod
    ? storedMethods.find((method) => method.method === preferredMethod) || null
    : null;
  const stored = preferredStoredMethod || (!preferredMethod ? storedMethods[0] || null : null);

  if (!stored) {
    return {
      ...defaultPaymentReceivingFormValues,
      method: preferredMethod || defaultPaymentReceivingFormValues.method,
    };
  }

  if (stored.method === 'international_bank_transfer') {
    return {
      ...defaultPaymentReceivingFormValues,
      method: stored.method,
      accountTitle: stored.accountTitle,
      bankName: stored.bankName,
      iban: stored.iban,
      swiftCode: stored.swiftCode,
    };
  }

  if (stored.method === 'pakistan_bank_transfer') {
    return {
      ...defaultPaymentReceivingFormValues,
      method: stored.method,
      accountTitle: stored.accountTitle,
      bankName: stored.bankName,
      accountNumber: stored.accountNumber,
      iban: stored.iban,
    };
  }

  return {
    ...defaultPaymentReceivingFormValues,
    method: stored.method,
    accountTitle: stored.accountTitle,
    provider: stored.provider,
    phoneNumber: stored.phoneNumber,
  };
};

export const buildPaymentReceivingDetails = (
  values: PaymentReceivingFormValues,
): PaymentReceivingMethod => {
  if (values.method === 'international_bank_transfer') {
    return {
      method: values.method,
      accountTitle: values.accountTitle.trim(),
      bankName: values.bankName.trim(),
      iban: normalizeIban(values.iban),
      swiftCode: normalizeSwift(values.swiftCode),
    };
  }

  if (values.method === 'pakistan_bank_transfer') {
    return {
      method: values.method,
      accountTitle: values.accountTitle.trim(),
      bankName: values.bankName.trim(),
      accountNumber: values.accountNumber.trim(),
      iban: normalizeIban(values.iban),
    };
  }

  return {
    method: values.method,
    accountTitle: values.accountTitle.trim(),
    provider: values.provider,
    phoneNumber: normalizePkPhoneNumber(values.phoneNumber),
  };
};

export const parsePaymentReceivingDetails = (
  source?: LegacyPaymentFields | null,
): PaymentReceivingMethod | null => parsePaymentReceivingDetailsCollection(source)[0] || null;

export const upsertPaymentReceivingMethod = (
  existingMethods: PaymentReceivingMethod[],
  nextMethod: PaymentReceivingMethod,
): PaymentReceivingDetailsPayload => ({
  methods: [
    nextMethod,
    ...existingMethods.filter((method) => method.method !== nextMethod.method),
  ],
});

export const removePaymentReceivingMethod = (
  existingMethods: PaymentReceivingMethod[],
  methodToRemove: PaymentMethod,
): PaymentReceivingDetailsPayload => ({
  methods: existingMethods.filter((method) => method.method !== methodToRemove),
});

export const toLegacyPaymentColumns = (details: PaymentReceivingMethod) => {
  if (details.method === 'pakistan_bank_transfer') {
    return {
      payment_account_name: details.accountTitle,
      payment_account_number: details.accountNumber,
      payment_bank_name: details.bankName,
      payment_link: null,
    };
  }

  if (details.method === 'international_bank_transfer') {
    return {
      payment_account_name: details.accountTitle,
      payment_account_number: details.iban,
      payment_bank_name: details.bankName,
      payment_link: null,
    };
  }

  return {
    payment_account_name: details.accountTitle,
    payment_account_number: details.phoneNumber,
    payment_bank_name:
      details.provider === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
    payment_link: null,
  };
};

export const getPaymentMethodLabel = (method: PaymentMethod) =>
  PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label || method;

export const getPaymentReceivingRows = (details: PaymentReceivingMethod) => {
  if (details.method === 'international_bank_transfer') {
    return [
      { label: 'Payment Method', value: getPaymentMethodLabel(details.method) },
      { label: 'Account Title', value: details.accountTitle },
      { label: 'Bank Name', value: details.bankName },
      { label: 'IBAN', value: details.iban },
      { label: 'SWIFT / BIC', value: details.swiftCode },
    ];
  }

  if (details.method === 'pakistan_bank_transfer') {
    return [
      { label: 'Payment Method', value: getPaymentMethodLabel(details.method) },
      { label: 'Account Title', value: details.accountTitle },
      { label: 'Bank Name', value: details.bankName },
      { label: 'Account Number', value: details.accountNumber },
      { label: 'IBAN', value: details.iban },
    ];
  }

  return [
    { label: 'Payment Method', value: getPaymentMethodLabel(details.method) },
    { label: 'Account Title', value: details.accountTitle },
    {
      label: 'Wallet Provider',
      value: details.provider === 'easypaisa' ? 'Easypaisa' : 'JazzCash',
    },
    { label: 'Wallet Number', value: details.phoneNumber },
  ];
};

export const getPaymentReceivingSections = (details: PaymentReceivingMethod[]) =>
  details.map((methodDetails) => ({
    key: methodDetails.method,
    title: getPaymentMethodLabel(methodDetails.method),
    rows: getPaymentReceivingRows(methodDetails),
  }));
