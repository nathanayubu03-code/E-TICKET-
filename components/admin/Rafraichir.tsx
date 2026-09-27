'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Rafraîchit la page serveur à intervalle régulier (suivi en direct). */
export function Rafraichir({ secondes = 10 }: { secondes?: number }) {
  const router = useRouter();
  useEffect(() => {
    const m = setInterval(() => router.refresh(), secondes * 1000);
    return () => clearInterval(m);
  }, [router, secondes]);
  return null;
}
