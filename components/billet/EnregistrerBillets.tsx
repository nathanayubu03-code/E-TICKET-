'use client';

import { useEffect } from 'react';
import type { BilletHorsLigne } from '@/lib/billets/hors-ligne';
import { enregistrerBillets } from '@/lib/billets/stockage-local';

/** Enregistre les billets affichés sur ce téléphone dès l'ouverture de la page. */
export function EnregistrerBillets({ billets }: { billets: BilletHorsLigne[] }) {
  useEffect(() => { void enregistrerBillets(billets); }, [billets]);
  return null;
}
