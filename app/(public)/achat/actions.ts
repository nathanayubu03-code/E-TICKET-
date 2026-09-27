'use server';

import { getTranslations } from 'next-intl/server';
import { auditer } from '@/lib/audit';
import { sessionCourante } from '@/lib/auth/session';
import { CommandeRefusee, creerCommande, lireLignes } from '@/lib/commandes';
import { db } from '@/lib/db';
import { exigerLimites, TropDeDemandes } from '@/lib/limites';
import { ipClient } from '@/lib/requete';

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
    const c = await creerCommande({ telephone: s.user.telephone, userId: s.user.id, evenementId: e.id, lignes: lireLignes(lignesBrutes), codePromo: codePromo?.trim() || null });
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
