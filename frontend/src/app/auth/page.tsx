import { Suspense } from 'react';
import { AuthPage } from '@/features/auth/AuthPage';

export default function AuthPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthPage />
    </Suspense>
  );
}
