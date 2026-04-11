// src/lib/userId.ts
// Returns the currently selected store's owner ID.
// When multi-store is active this is the storeId; for legacy single-store
// setups it keeps backward-compatibility by falling back to ownerUserId.

export const getOwnerId = (): string | null => {
  if (typeof window === 'undefined') return null;
  // Prefer the active store ID (multi-store mode)
  const activeStoreId = localStorage.getItem('activeStoreId');
  if (activeStoreId) return activeStoreId;
  // Legacy fallback
  return localStorage.getItem('ownerUserId');
};

export const getActiveStoreId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('activeStoreId');
};

export const setActiveStore = (storeId: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('activeStoreId', storeId);
  localStorage.setItem('ownerUserId', storeId); // backward-compat
};

export const clearActiveStore = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('activeStoreId');
  localStorage.removeItem('ownerUserId');
};