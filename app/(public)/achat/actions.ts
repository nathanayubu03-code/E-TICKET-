'use server';

import { getLocale, getTranslations } from 'next-intl/server';
import { auditer } from '@/lib/audit';
import { sessionCourante } from '@/lib/auth/session';
import { CommandeRefusee, creerCommande, lireLignes } from '@/lib/commandes';
import { db } from '@/lib/db';
import { exigerLimites, TropDeDemandes } from '@/lib/limites';
import { ipClient } from '@/lib/requete';
import { commandeDeLAcheteur } from '@/lib/achat';
import type { Operateur } from '@/lib/db';
import { OPERATEURS } from '@/lib/operateurs';
import { demanderPaiement } from '@/lib/paiement';
import { declarerPaiementManuel } from '@/lib/paiement/manuel';
import { normaliserTelephone } from '@/lib/telephone';

export type ReponseReservation = { ok: true; code: string } | { ok: false; message: string };

export async function reserver(slug: string, lignesBrutes: string, codePromo: string | null): Promise<ReponseReservation> {
  const t = await getTranslations();
  const s = await sessionCourante();
  if (!s) return { ok: false, message: t('connexion.texte') };
  const ip = await ipClient();
  try {
    await exigerLimites([{ cle: `commande:ip:${ip}`, max: 30, fenetre: 3600 }, { cle: `commande:tel:${s.user.telephone}`, max: 15, fenetre: 3600 }]);
  } catch (e) {
    if (e instanceof TropDeDemandes) return { ok: false, message: t('commun.tropDeDemandes') };
    throw e;
  }
  const e = await db.event.findUnique({ where: { slug }, select: { id: true, limiteParPersonne: true } });
  if (!e) return { ok: false, message: t('commun.erreurInconnue') };
  try {
    const c = await creerCommande({ telephone: s.user.telephone, userId: s.user.id, evenementId: e.id, lignes: lireLignes(lignesBrutes), codePromo: codePromo?.trim() || null, langue: await getLocale() });
    await auditer({ acteur: s.user, action: 'commande.creer', entite: 'Order', entiteId: c.id, apres: { code: c.code, totalCdf: c.totalCdf }, ip });
    return { ok: true, code: c.code };
  } catch (err) {
    if (!(err instanceof CommandeRefusee)) throw err;
    const x = err.erreur;
    const message = x.code === 'plus_assez' ? t('evenement.plusAssez')
      : x.code === 'limite_personne' ? t('evenement.limiteNumero', { max: x.max })
      : x.code === 'limite_commande' ? t('evenement.limite', { max: x.max })
      : x.code === 'promo_invalide' ? t('achat.promoInvalide')
      : x.code === 'vente_fermee' ? t('evenement.venteTerminee')
      : t('commun.erreurInconnue');
    return { ok: false, message };
  }
}

export type ReponsePaiement = { ok: true } | { ok: false; message: string; expire?: boolean };

export async function payer(code: string, operateur: string, chiffres: string, nouvelle: boolean): Promise<ReponsePaiement> {
  const t = await getTranslations();
  const s = await sessionCourante();
  const c = await commandeDeLAcheteur(code, s);
  if (!s || !c) return { ok: false, message: t('achat.commandeIntrouvable') };
  const telephone = normaliserTelephone(chiffres);
  if (!telephone) return { ok: false, message: t('telephone.invalide') };
  if (!OPERATEURS.some((o) => o.k === operateur)) return { ok: false, message: t('commun.erreurInconnue') };
  try {
    await exigerLimites([{ cle: `paiement:tel:${s.user.telephone}`, max: 12, fenetre: 3600 }, { cle: `paiement:ip:${await ipClient()}`, max: 30, fenetre: 3600 }]);
  } catch (e) {
    if (e instanceof TropDeDemandes) return { ok: false, message: t('commun.tropDeDemandes') };
    throw e;
  }
  const r = await demanderPaiement({ commandeId: c.id, telephone, operateur: operateur as Operateur, nouvelle });
  if (r.ok) return { ok: true };
  if (r.raison === 'reservation_expiree') return { ok: false, message: t('achat.reservationExpiree'), expire: true };
  if (r.raison === 'paiement_indisponible') return { ok: false, message: t('achat.paiementIndisponible') };
  return { ok: false, message: t('commun.erreurInconnue') };
}

export async function declarerAgent(code: string, _e: { ok: boolean; message?: string; erreurs?: Record<string, string> }, formData: FormData) {
  const t = await getTranslations();
  const s = await sessionCourante();
  const c = await commandeDeLAcheteur(code, s);
  if (!s || !c) return { ok: false, message: t('achat.commandeIntrouvable') };
  const operateur = String(formData.get('operateur') ?? '');
  const telephonePayeur = normaliserTelephone(String(formData.get('telephone') ?? ''));
  const erreurs: Record<string, string> = {};
  if (!OPERATEURS.some((o) => o.k === operateur)) erreurs.operateur = t('commun.champObligatoire');
  if (!telephonePayeur) erreurs.telephone = t('telephone.invalide');
  if (Object.keys(erreurs).length) return { ok: false, erreurs };
  try {
    await exigerLimites([{ cle: `agent:tel:${s.user.telephone}`, max: 10, fenetre: 3600 }]);
  } catch (e) {
    if (e instanceof TropDeDemandes) return { ok: false, message: t('commun.tropDeDemandes') };
    throw e;
  }
  const r = await declarerPaiementManuel({ commandeId: c.id, operateur: operateur as Operateur, reference: String(formData.get('reference') ?? ''), telephonePayeur: telephonePayeur! });
  if (r.ok) {
    await auditer({ acteur: s.user, action: 'paiement_manuel.declarer', entite: 'Order', entiteId: c.id, apres: { operateur } });
    return { ok: true, message: t('agent.recu') };
  }
  if (r.raison === 'reference_utilisee') return { ok: false, erreurs: { reference: t('agent.dejaUtilisee') } };
  if (r.raison === 'reference_invalide') return { ok: false, erreurs: { reference: t('commun.champObligatoire') } };
  if (r.raison === 'plus_de_place') return { ok: false, message: t('evenement.plusAssez') };
  return { ok: false, message: t('achat.commandeIntrouvable') };
}
