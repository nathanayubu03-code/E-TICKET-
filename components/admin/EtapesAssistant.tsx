'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';

export const ETAPES = [
  ['infos', 'Informations'], ['lieu', 'Lieu et date'], ['billets', 'Billets'], ['programme', 'Programme'],
  ['pratique', 'Infos pratiques'], ['visuels', 'Visuels'], ['apercu', 'Aperçu'], ['publication', 'Publication'],
] as const;

export function EtapesAssistant({ id }: { id: string }) {
  const segment = useSelectedLayoutSegment();
  return (
    <nav className="etapes-assistant" aria-label="Étapes">
      {ETAPES.map(([cle, nom]) => <Link key={cle} href={`/admin/evenements/${id}/${cle}`} aria-current={segment === cle ? 'step' : undefined}>{nom}</Link>)}
    </nav>
  );
}
