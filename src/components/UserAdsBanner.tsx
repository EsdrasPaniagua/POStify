"use client";

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/src/lib/firebase';
import { AdsBanner } from './AdsBanner';

export function UserAdsBanner() {
  const [user, loading] = useAuthState(auth);

  if (!user || loading) return null;

  return <AdsBanner />;
}