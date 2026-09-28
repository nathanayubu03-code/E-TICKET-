'use client';

import { openDB, type IDBPDatabase } from 'idb';
import type { BilletHorsLigne } from './hors-ligne';

// Billets enregistrés sur le téléphone, lisibles sans réseau.
export interface BilletEnregistre extends BilletHorsLigne { decalageMs: number; enregistreLe: number }

let base: Promise<IDBPDatabase> | null = null;
function ouvrir() {
  base ??= openDB('e-ticket', 1, { upgrade(d) { d.createObjectStore('billets', { keyPath: 'publicId' }); } });
  return base;
}

/** Enregistre des billets. Le décalage d'horloge (serveur moins téléphone) est mesuré maintenant et stocké avec eux. */
export async function enregistrerBillets(billets: BilletHorsLigne[]): Promise<void> {
  try {
    const d = await ouvrir();
    const tx = d.transaction('billets', 'readwrite');
    const maintenant = Date.now();
    for (const b of billets) await tx.store.put({ ...b, decalageMs: b.heureServeur - maintenant, enregistreLe: maintenant } satisfies BilletEnregistre);
    await tx.done;
  } catch { /* stockage indisponible (navigation privée) : le billet reste accessible en ligne */ }
}

export async function lireBillets(): Promise<BilletEnregistre[]> {
  try { return (await (await ouvrir()).getAll('billets')) as BilletEnregistre[]; } catch { return []; }
}
