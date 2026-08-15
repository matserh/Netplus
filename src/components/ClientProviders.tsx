'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { UserProgressProvider } from '@/contexts/UserProgressContext';
import { DynamicThemeProvider } from '@/contexts/ThemeContext';
import { ChallengeProvider } from '@/contexts/ChallengeContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { WatchHistoryProvider } from '@/contexts/WatchHistoryContext';
import { ShortsProvider } from '@/contexts/ShortsContext';
import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <UserProgressProvider>
          <DynamicThemeProvider>
            <ChallengeProvider>
              <ProfileProvider>
                <WatchHistoryProvider>
                  <ShortsProvider>
                    {children}
                  </ShortsProvider>
                </WatchHistoryProvider>
              </ProfileProvider>
            </ChallengeProvider>
          </DynamicThemeProvider>
        </UserProgressProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
