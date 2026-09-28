import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { FournisseurSmsIndisponible, type SmsProvider } from './fournisseur';
import { SimulationSmsProvider } from './simulation';

let instance: SmsProvider | null = null;

export function fournisseurSms(): SmsProvider {
  if (instance) return instance;
  switch (env().SMS_PROVIDER) {
    case 'simulation': instance = new SimulationSmsProvider(); break;
    default: throw new FournisseurSmsIndisponible();
  }
  return instance;
}

/** Pour les tests : remplace le fournisseur. */
export function remplacerFournisseurSms(f: SmsProvider | null) { instance = f; }

/**
 * Envoie un SMS et le journalise dans SmsLog. Ne lève pas d'erreur : un SMS perdu ne doit pas
 * casser une commande payée. L'échec est visible dans l'administration.
 */
export async function envoyerSms(telephone: string, gabarit: string, texte: string, { masquer = false } = {}): Promise<boolean> {
  let fournisseur: SmsProvider;
  try {
    fournisseur = fournisseurSms();
  } catch {
    await db.smsLog.create({ data: { telephone, gabarit, contenu: masquer ? '[masqué]' : texte, fournisseur: 'non_configure', statut: 'ECHOUE', erreur: 'Aucun fournisseur SMS configuré' } });
    return false;
  }
  // Les codes OTP ne sont journalisés en clair qu'en simulation (développement).
  const contenu = masquer && fournisseur.nom !== 'simulation' ? '[masqué]' : texte;
  const log = await db.smsLog.create({ data: { telephone, gabarit, contenu, fournisseur: fournisseur.nom } });
  try {
    const r = await fournisseur.envoyer(telephone, texte);
    await db.smsLog.update({ where: { id: log.id }, data: { statut: 'ENVOYE', referenceFournisseur: r.reference } });
    return true;
  } catch (e) {
    await db.smsLog.update({ where: { id: log.id }, data: { statut: 'ECHOUE', erreur: e instanceof Error ? e.message.slice(0, 500) : 'erreur' } });
    return false;
  }
}
