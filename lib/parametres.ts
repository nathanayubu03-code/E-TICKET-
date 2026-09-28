import { db } from './db';
import { PARAMETRES_DEFAUT } from './referentiel';

type Cles = keyof typeof PARAMETRES_DEFAUT;
type Valeur<K extends Cles> = (typeof PARAMETRES_DEFAUT)[K] extends number ? number : (typeof PARAMETRES_DEFAUT)[K];

export async function parametre<K extends Cles>(cle: K): Promise<Valeur<K>> {
  const ligne = await db.setting.findUnique({ where: { cle } });
  return (ligne?.valeur ?? PARAMETRES_DEFAUT[cle]) as Valeur<K>;
}

export async function tauxCourant(): Promise<{ cdfParUsd: number; effectifLe: Date; id: string } | null> {
  return db.exchangeRate.findFirst({ where: { effectifLe: { lte: new Date() } }, orderBy: { effectifLe: 'desc' }, select: { id: true, cdfParUsd: true, effectifLe: true } });
}
