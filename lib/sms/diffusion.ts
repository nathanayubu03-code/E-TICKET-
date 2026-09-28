import { auditer, type Acteur } from '@/lib/audit';
import { db } from '@/lib/db';
import { dateCourte } from '@/lib/fuseaux';
import { langueSure, texteEvenement } from '@/lib/langue';
import { envoyerSms } from './index';
import { smsListeAttente, smsNouvelEvenement } from './gabarits';

/**
 * Alerte les abonnés (consentement explicite, non désinscrits) à la première publication d'un événement :
 * ceux de sa ville et ceux qui ont choisi « toutes les villes ». Un numéro reçoit un seul SMS.
 */
export async function alerterNouvelEvenement(evenementId: string): Promise<number> {
  const e = await db.event.findUniqueOrThrow({ where: { id: evenementId }, include: { ville: true } });
  const abonnes = await db.smsAlertSubscription.findMany({ where: { desinscritLe: null, OR: [{ villeId: null }, ...(e.villeId ? [{ villeId: e.villeId }] : [])] }, select: { telephone: true, langue: true }, orderBy: { consentementLe: 'desc' } });
  // Un SMS par numéro, dans la langue de son abonnement le plus récent.
  const parNumero = new Map<string, string>();
  for (const a of abonnes) if (!parNumero.has(a.telephone)) parNumero.set(a.telephone, langueSure(a.langue));
  const numeros = [...parNumero.keys()];
  const texte = (langue: string) => smsNouvelEvenement(texteEvenement(e, 'titre', langue), e.ville?.nom ?? null, e.debutLe ? dateCourte(e.debutLe, e.ville?.fuseau ?? undefined, langue) : '', e.slug, langue);
  let envoyes = 0;
  for (const [tel, langue] of parNumero) if (await envoyerSms(tel, 'alerte_evenement', texte(langue))) envoyes++;
  await auditer({ action: 'sms.alerte_evenement', entite: 'Event', entiteId: evenementId, apres: { destinataires: numeros.length, envoyes } });
  return envoyes;
}

/** Prévient la liste d'attente que des places sont disponibles (déclenché par un administrateur). */
export async function prevenirListeAttente(evenementId: string, acteur: Acteur): Promise<number> {
  const e = await db.event.findUniqueOrThrow({ where: { id: evenementId } });
  const inscrits = await db.waitlistEntry.findMany({ where: { evenementId, prevenuLe: null } });
  let envoyes = 0;
  for (const i of inscrits) {
    if (await envoyerSms(i.telephone, 'liste_attente', smsListeAttente(texteEvenement(e, 'titre', i.langue), e.slug, langueSure(i.langue)))) {
      await db.waitlistEntry.update({ where: { id: i.id }, data: { prevenuLe: new Date() } });
      envoyes++;
    }
  }
  await auditer({ acteur, action: 'sms.liste_attente', entite: 'Event', entiteId: evenementId, apres: { inscrits: inscrits.length, envoyes } });
  return envoyes;
}
