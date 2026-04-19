const ACTIVE_ORGANIZATION_STORAGE_KEY = 'evoltra.activeOrganizationId';

const isBrowser = typeof window !== 'undefined';

export const getStoredOrganizationId = () => {
  if (!isBrowser) return null;
  return window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
};

export const setStoredOrganizationId = (organizationId: string | null) => {
  if (!isBrowser) return;

  if (organizationId === null) {
    window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
};

