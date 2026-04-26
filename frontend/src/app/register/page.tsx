'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const { isLoggedIn, isLoading, openModal } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isLoggedIn) { router.replace('/analyzer'); return; }
    openModal();
    router.replace('/analyzer');
  }, [isLoading, isLoggedIn, openModal, router]);

  return null;
}
