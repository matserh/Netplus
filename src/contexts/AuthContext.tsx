'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider basePath={API_BASE ? `${API_BASE}/api/auth` : undefined}>{children}</SessionProvider>;
}
