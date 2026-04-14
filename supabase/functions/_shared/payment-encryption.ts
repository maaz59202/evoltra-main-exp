const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type EncryptedJsonEnvelope = {
  version: 1;
  alg: "AES-GCM";
  iv: string;
  ciphertext: string;
};

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

const isEncryptedEnvelope = (value: unknown): value is EncryptedJsonEnvelope =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (value as Record<string, unknown>).version === 1 &&
  (value as Record<string, unknown>).alg === "AES-GCM" &&
  typeof (value as Record<string, unknown>).iv === "string" &&
  typeof (value as Record<string, unknown>).ciphertext === "string";

const getEncryptionKey = async () => {
  const secret = Deno.env.get("PAYMENT_DETAILS_ENCRYPTION_KEY");
  if (!secret) {
    throw new Error("PAYMENT_DETAILS_ENCRYPTION_KEY is not configured");
  }

  const hashedSecret = await crypto.subtle.digest("SHA-256", encoder.encode(secret));

  return crypto.subtle.importKey(
    "raw",
    hashedSecret,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encryptJsonValue = async (value: unknown): Promise<EncryptedJsonEnvelope> => {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);

  return {
    version: 1,
    alg: "AES-GCM",
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
  };
};

export const decryptJsonValue = async <T>(value: unknown): Promise<T | null> => {
  if (!value) return null;
  if (!isEncryptedEnvelope(value)) {
    return value as T;
  }

  const key = await getEncryptionKey();
  const iv = fromBase64(value.iv);
  const ciphertext = fromBase64(value.ciphertext);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return JSON.parse(decoder.decode(decrypted)) as T;
};
