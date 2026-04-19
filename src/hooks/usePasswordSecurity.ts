import { useEffect, useMemo, useState } from 'react';

type PasswordRequirement = {
  text: string;
  met: boolean;
};

type PasswordStrengthLabel = 'Weak' | 'Fair' | 'Good' | 'Strong';

const breachCache = new Map<string, number | null>();

const sha1Hex = async (value: string) => {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-1', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
};

const fetchBreachCount = async (password: string, signal?: AbortSignal) => {
  if (breachCache.has(password)) {
    return breachCache.get(password) ?? null;
  }

  const hash = await sha1Hex(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    method: 'GET',
    headers: {
      'Add-Padding': 'true',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Breach lookup failed with status ${response.status}`);
  }

  const text = await response.text();
  const match = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${suffix}:`));

  const count = match ? Number(match.split(':')[1]) || 0 : 0;
  breachCache.set(password, count);
  return count;
};

const getStrengthLabel = (score: number): PasswordStrengthLabel => {
  if (score >= 5) return 'Strong';
  if (score >= 4) return 'Good';
  if (score >= 3) return 'Fair';
  return 'Weak';
};

export const usePasswordSecurity = (password: string) => {
  const requirements = useMemo<PasswordRequirement[]>(
    () => [
      { text: 'At least 10 characters', met: password.length >= 10 },
      { text: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
      { text: 'Contains lowercase letter', met: /[a-z]/.test(password) },
      { text: 'Contains a number', met: /\d/.test(password) },
      { text: 'Contains a symbol', met: /[^A-Za-z0-9]/.test(password) },
    ],
    [password],
  );

  const score = requirements.filter((requirement) => requirement.met).length;
  const [breachCount, setBreachCount] = useState<number | null>(null);
  const [checkingBreach, setCheckingBreach] = useState(false);
  const [breachLookupFailed, setBreachLookupFailed] = useState(false);

  useEffect(() => {
    if (!password || password.length < 10) {
      setBreachCount(null);
      setCheckingBreach(false);
      setBreachLookupFailed(false);
      return;
    }

    const controller = new AbortController();
    let active = true;

    const timeoutId = window.setTimeout(async () => {
      setCheckingBreach(true);
      setBreachLookupFailed(false);

      try {
        const count = await fetchBreachCount(password, controller.signal);
        if (active) {
          setBreachCount(count);
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          console.warn('Password breach lookup failed:', error);
          setBreachCount(null);
          setBreachLookupFailed(true);
        }
      } finally {
        if (active) {
          setCheckingBreach(false);
        }
      }
    }, 450);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [password]);

  return {
    requirements,
    strengthScore: score,
    strengthLabel: getStrengthLabel(score),
    isStrongEnough: requirements.every((requirement) => requirement.met),
    isCompromised: (breachCount ?? 0) > 0,
    breachCount,
    checkingBreach,
    breachLookupFailed,
  };
};
