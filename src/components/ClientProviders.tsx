'use client';

import { LanguageProvider } from '@/contexts/LanguageContext';
import { UserProgressProvider } from '@/contexts/UserProgressContext';
import { DynamicThemeProvider } from '@/contexts/ThemeContext';
import { ChallengeProvider } from '@/contexts/ChallengeContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { WatchHistoryProvider } from '@/contexts/WatchHistoryContext';
import { ShortsProvider } from '@/contexts/ShortsContext';
import { GuestProvider } from '@/contexts/GuestContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { BetaProvider } from '@/contexts/BetaContext';
import { ReactNode } from 'react';
// Force-load API_CONFIG in the initial client bundle to prevent
// "API_CONFIG is not defined" ReferenceError from chunk load ordering
import '@/types/media';

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <BetaProvider>
        <GuestProvider>
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
        </GuestProvider>
      </BetaProvider>
    </AuthProvider>
  );
}