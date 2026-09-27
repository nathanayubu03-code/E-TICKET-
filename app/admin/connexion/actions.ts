'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auditer } from '@/lib/audit';
import { effacerAttente, lireAttente, poserAttente } from '@/lib/auth/attente';
import { verifierMotDePasse } from '@/lib/auth/motdepasse';
import { envoyerOtp, verifierOtp } from '@/lib/auth/otp';
import { aUnRole, ROLES_EXIGEANT_MOT_DE_PASSE } from '@/lib/auth/roles';
import { fermerSession, ouvrirSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { limiter } from '@/lib/limites';
import { ipClient } from '@/lib/requete';
import { normaliserTelephone } from '@/lib/telephone';

export interface EtatConnexion { etape: 'identifiants' | 'code'; message?: string; codeTest?: string }

const MESSAGE_GENERIQUE = 'Numéro ou mot de passe incorrect.';

export async function validerIdentifiants(_e: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const ip = await ipClient();
  const telephone = normaliserTelephone(String(formData.get('telephone') ?? ''));
  const motDePasse = String(formData.get('motDePasse') ?? '');
  if (!(await limiter(`admin-mdp:ip:${ip}`, 20, 900)).ok || (telephone && !(await limiter(`admin-mdp:tel:${telephone}`, 8, 900)).ok)) {
    return { etape: 'identifiants', message: 'Trop de tentatives. Réessayez dans 15 minutes.' };
  }
  const user = telephone ? await db.user.findUnique({ where: { telephone } }) : null;
  // Vérification faite même sans utilisateur, pour ne pas révéler l'existence d'un compte par le temps de réponse.
  const ok = await verifierMotDePasse(user?.motDePasse ?? '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', motDePasse);
  if (!user || !ok || user.desactiveLe || !aUnRole(user.roles, ROLES_EXIGEANT_MOT_DE_PASSE)) {
    await auditer({ action: 'admin.connexion_refusee', entite: 'User', entiteId: user?.id ?? null, ip });
    return { etape: 'identifiants', message: MESSAGE_GENERIQUE };
  }
  const envoi = await envoyerOtp(user.telephone, 'ADMIN_DEUXIEME_ETAPE', ip);
  if (!envoi.ok && envoi.raison !== 'trop_tot') {
    return { etape: 'identifiants', message: envoi.raison === 'sms_indisponible' ? "Le SMS n'a pas pu être envoyé. Vérifiez la configuration du fournisseur SMS." : 'Trop de codes demandés. Réessayez plus tard.' };
  }
  await poserAttente(user.id);
  return { etape: 'code', ...(envoi.ok && envoi.codeTest ? { codeTest: envoi.codeTest } : {}) };
}

export async function validerCodeAdmin(_e: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  const ip = await ipClient();
  const userId = await lireAttente();
  if (!userId) return { etape: 'identifiants', message: 'La connexion a expiré. Recommencez.' };
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const r = await verifierOtp(user.telephone, 'ADMIN_DEUXIEME_ETAPE', String(formData.get('code') ?? ''));
  if (!r.ok) {
    if (r.raison === 'expire') { await effacerAttente(); return { etape: 'identifiants', message: 'Ce code a expiré ou a trop servi. Recommencez.' }; }
    return { etape: 'code', message: `Code incorrect. Il vous reste ${r.restants} essai${r.restants > 1 ? 's' : ''}.` };
  }
  await effacerAttente();
  await ouvrirSession(user.id, { deuxiemeEtape: true, ip, userAgent: (await headers()).get('user-agent') ?? undefined });
  await auditer({ acteur: user, action: 'admin.connexion', entite: 'User', entiteId: user.id, ip });
  const suite = String(formData.get('suite') ?? '');
  const cible = suite.startsWith('/admin') || suite.startsWith('/scan') ? suite : user.roles.includes('CONTROLEUR') && !aUnRole(user.roles, ['SUPERADMIN', 'ADMIN', 'AGENT', 'ORGANISATEUR']) ? '/scan' : '/admin';
  redirect(cible);
}

export async function seDeconnecter() {
  await fermerSession();
  redirect('/');
}
