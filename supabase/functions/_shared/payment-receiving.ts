export type PaymentReceivingDetails =
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

export const parsePaymentReceivingDetails = (value: unknown): PaymentReceivingDetails | null => {
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

export const toMaskedLegacyColumns = (details: PaymentReceivingDetails) => {
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
