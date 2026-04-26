'use client';

import { ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

function Wrapper({ children }: { children: ReactNode }) {
  if (GOOGLE_CLIENT_ID) {
    return <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>;
  }
  return <>{children}</>;
}

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <Wrapper>
      <AuthProvider>
        {children}
        <AuthModal />
      </AuthProvider>
    </Wrapper>
  );
}
