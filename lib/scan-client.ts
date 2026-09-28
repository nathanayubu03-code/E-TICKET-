'use client';

import { openDB, type IDBPDatabase } from 'idb';
import type { Manifeste, ScanHorsLigne } from './scan';

// Données du scanner sur l'appareil : manifeste de l'événement et scans en attente d'envoi.
export interface ManifesteLocal extends Manifeste { appareilId: string; decalageMs: number; telechargeLe: number }

let base: Promise<IDBPDatabase> | null = null;
function ouvrir() {
  base ??= openDB('e-ticket-scanner', 1, {
    upgrade(d) {
      d.createObjectStore('manifestes', { keyPath: 'evenement.id' });
      d.createObjectStore('attente', { keyPath: 'scanClientId' }).createIndex('evenement', 'evenementId');
    },
  });
  return base;
}

export async function lireManifeste(evenementId: string): Promise<ManifesteLocal | null> {
  try { return ((await (await ouvrir()).get('manifestes', evenementId)) as ManifesteLocal | undefined) ?? null; } catch { return null; }
}
export async function ecrireManifeste(m: ManifesteLocal) {
  await (await ouvrir()).put('manifestes', m);
}
export async function ajouterEnAttente(evenementId: string, s: ScanHorsLigne) {
  await (await ouvrir()).put('attente', { ...s, evenementId });
}
export async function lireEnAttente(evenementId: string): Promise<ScanHorsLigne[]> {
  const tous = (await (await ouvrir()).getAllFromIndex('attente', 'evenement', evenementId)) as (ScanHorsLigne & { evenementId: string })[];
  return tous.map((x) => { const s: ScanHorsLigne & { evenementId?: string } = { ...x }; delete s.evenementId; return s; });
}
export async function retirerEnAttente(ids: string[]) {
  const d = await ouvrir();
  const tx = d.transaction('attente', 'readwrite');
  for (const id of ids) await tx.store.delete(id);
  await tx.done;
}

export async function sha256Hex(texte: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(h), (o) => o.toString(16).padStart(2, '0')).join('');
}

export const idScan = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
