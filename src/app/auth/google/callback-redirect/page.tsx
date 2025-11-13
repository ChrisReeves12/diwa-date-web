'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GoogleCallbackRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Give the browser a moment to process the Set-Cookie header
    const timer = setTimeout(() => {
      // Refresh the router to re-render with the new session cookie available
      router.refresh();
      // Then push to home
      router.push('/');
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p>Completing sign in...</p>
    </div>
  );
}
