'use client';

import { useRouter } from 'next/navigation';
import { ConnexionOtp, type TextesConnexion } from './ConnexionOtp';

export function ConnexionPage({ textes, suite }: { textes: TextesConnexion; suite: string }) {
  const router = useRouter();
  return <ConnexionOtp textes={textes} onConnecte={() => { router.replace(suite); router.refresh(); }} />;
}
