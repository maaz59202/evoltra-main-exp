export type PaymentReceivingMethod =
  | {
      method: "international_bank_transfer";
      accountTitle: string;
      bankName: string;
      iban: string;
      swiftCode: string;
    }
  | {
      method: "pakistan_bank_transfer";
      accountTitle: string;
      bankName: string;
      accountNumber: string;
      iban: string;
    }
  | {
      method: "pakistan_mobile_wallet";
      accountTitle: string;
      provider: "easypaisa" | "jazzcash";
      phoneNumber: string;
    };

const parsePaymentReceivingMethod = (value: unknown): PaymentReceivingMethod | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    candidate.method === "international_bank_transfer" &&
    typeof candidate.accountTitle === "string" &&
    typeof candidate.bankName === "string" &&
    typeof candidate.iban === "string" &&
    typeof candidate.swiftCode === "string"
  ) {
    return {
      method: candidate.method,
      accountTitle: candidate.accountTitle,
      bankName: candidate.bankName,
      iban: candidate.iban,
      swiftCode: candidate.swiftCode,
    };
  }

  if (
    candidate.method === "pakistan_bank_transfer" &&
    typeof candidate.accountTitle === "string" &&
    typeof candidate.bankName === "string" &&
    typeof candidate.accountNumber === "string" &&
    typeof candidate.iban === "string"
  ) {
    return {
      method: candidate.method,
      accountTitle: candidate.accountTitle,
      bankName: candidate.bankName,
      accountNumber: candidate.accountNumber,
      iban: candidate.iban,
    };
  }

  if (
    candidate.method === "pakistan_mobile_wallet" &&
    typeof candidate.accountTitle === "string" &&
    (candidate.provider === "easypaisa" || candidate.provider === "jazzcash") &&
    typeof candidate.phoneNumber === "string"
  ) {
    return {
      method: candidate.method,
      accountTitle: candidate.accountTitle,
      provider: candidate.provider,
      phoneNumber: candidate.phoneNumber,
    };
  }

  return null;
};

export const parsePaymentReceivingDetailsCollection = (value: unknown): PaymentReceivingMethod[] => {
  if (!value || typeof value !== "object") {
    return [];
  }

  const methods: PaymentReceivingMethod[] = [];
  const pushIfValid = (entry: unknown) => {
    const parsed = parsePaymentReceivingMethod(entry);
    if (parsed && !methods.some((method) => method.method === parsed.method)) {
      methods.push(parsed);
    }
  };

  if (Array.isArray(value)) {
    value.forEach(pushIfValid);
    return methods;
  }

  const candidate = value as Record<string, unknown>;
  if (Array.isArray(candidate.methods)) {
    candidate.methods.forEach(pushIfValid);
    return methods;
  }

  pushIfValid(candidate);
  return methods;
};

export const parsePaymentReceivingDetails = (value: unknown): PaymentReceivingMethod | null =>
  parsePaymentReceivingDetailsCollection(value)[0] ?? null;

export const toMaskedLegacyColumns = (
  detailsInput: PaymentReceivingMethod | PaymentReceivingMethod[],
) => {
  const details = Array.isArray(detailsInput) ? detailsInput[0] : detailsInput;
  if (!details) {
    return {
      payment_account_name: null,
      payment_account_number: null,
      payment_bank_name: null,
      payment_link: null,
    };
  }

  const mask = (value: string, visible = 4) =>
    value.length <= visible ? value : `${"•".repeat(Math.max(0, value.length - visible))}${value.slice(-visible)}`;

  if (details.method === "international_bank_transfer") {
    return {
      payment_account_name: details.accountTitle,
      payment_account_number: mask(details.iban.replace(/\s+/g, "")),
      payment_bank_name: details.bankName,
      payment_link: null,
    };
  }

  if (details.method === "pakistan_bank_transfer") {
    return {
      payment_account_name: details.accountTitle,
      payment_account_number: mask(details.accountNumber.replace(/\s+/g, "")),
      payment_bank_name: details.bankName,
      payment_link: null,
    };
  }

  return {
    payment_account_name: details.accountTitle,
    payment_account_number: mask(details.phoneNumber.replace(/\s+/g, "")),
    payment_bank_name: details.provider === "easypaisa" ? "Easypaisa" : "JazzCash",
    payment_link: null,
  };
};
