export const getOwnerId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const ownerId = localStorage.getItem('ownerUserId');
  return ownerId;
};