import { Suspense } from 'react';
import { SearchLayout } from '@/features/search/SearchLayout';

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchLayout />
    </Suspense>
  );
}
