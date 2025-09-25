'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BackgroundProvider } from '@/components/shared/BackgroundContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { useSessionInitialization } from '@/hooks/useSessionInitialization';
import { NotificationProvider } from '@/components/shared/NotificationContext';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <SessionInitializer />
          <BackgroundProvider>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </BackgroundProvider>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Component to initialize session
function SessionInitializer() {
  useSessionInitialization();
  return null; // This component doesn't render anything
}
