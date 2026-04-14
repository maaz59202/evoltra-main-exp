const PENDING_INVITE_STORAGE_KEY = 'evoltra.pendingInvite';

const isBrowser = typeof window !== 'undefined';

interface PendingInviteState {
  token: string;
  email: string;
  path: string;
}

export const getPendingInvite = (): PendingInviteState | null => {
  if (!isBrowser) return null;

  try {
    const raw = window.localStorage.getItem(PENDING_INVITE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingInviteState>;
    if (!parsed?.token || !parsed?.path || !parsed?.email) return null;
    return {
      token: parsed.token,
      path: parsed.path,
      email: parsed.email,
    };
  } catch {
    return null;
  }
};

export const setPendingInvite = (token: string, email: string) => {
  if (!isBrowser) return;

  window.localStorage.setItem(
    PENDING_INVITE_STORAGE_KEY,
    JSON.stringify({
      token,
      email,
      path: `/invite/${token}`,
    } satisfies PendingInviteState)
  );
};

export const clearPendingInvite = () => {
  if (!isBrowser) return;
  window.localStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
};
