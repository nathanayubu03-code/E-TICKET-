import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db, type Role } from '@/lib/db';
import { env } from '@/lib/env';
import { COOKIE_ROLES, signerRoles } from './jeton-roles';
import { aUnRole, ROLES_EXIGEANT_MOT_DE_PASSE } from './roles';

export const COOKIE_SESSION = 'et_session';
const DUREE_ACHETEUR_MS = 30 * 86400_000;
const DUREE_ADMIN_MS = 12 * 3600_000;

const empreinte = (jeton: string) => createHash('sha256').update(jeton).digest('hex');
const securise = () => process.env.NODE_ENV === 'production';

export interface Utilisateur { id: string; telephone: string; nom: string | null; roles: Role[]; organisateurId: string | null }
export interface SessionCourante { id: string; user: Utilisateur; deuxiemeEtape: boolean }

export async function ouvrirSession(userId: string, { deuxiemeEtape = false, ip, userAgent }: { deuxiemeEtape?: boolean; ip?: string; userAgent?: string } = {}) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const admin = aUnRole(user.roles, ROLES_EXIGEANT_MOT_DE_PASSE) && deuxiemeEtape;
  const duree = admin ? DUREE_ADMIN_MS : DUREE_ACHETEUR_MS;
  const jeton = randomBytes(32).toString('base64url');
  const expireLe = new Date(Date.now() + duree);
  await db.session.create({ data: { jetonHash: empreinte(jeton), userId, expireLe, deuxiemeEtapeLe: deuxiemeEtape ? new Date() : null, ip, userAgent: userAgent?.slice(0, 200) } });
  const jar = await cookies();
  const options = { httpOnly: true, secure: securise(), sameSite: 'lax' as const, path: '/', expires: expireLe };
  jar.set(COOKIE_SESSION, jeton, options);
  jar.set(COOKIE_ROLES, await signerRoles(user.roles, expireLe.getTime(), deuxiemeEtape, env().SESSION_SECRET), options);
}

export const sessionCourante = cache(async (): Promise<SessionCourante | null> => {
  const jeton = (await cookies()).get(COOKIE_SESSION)?.value;
  if (!jeton) return null;
  const s = await db.session.findUnique({ where: { jetonHash: empreinte(jeton) }, include: { user: { select: { id: true, telephone: true, nom: true, roles: true, organisateurId: true, desactiveLe: true } } } });
  if (!s || s.expireLe < new Date() || s.user.desactiveLe) return null;
  const user: Utilisateur = { id: s.user.id, telephone: s.user.telephone, nom: s.user.nom, roles: s.user.roles, organisateurId: s.user.organisateurId };
  return { id: s.id, user, deuxiemeEtape: Boolean(s.deuxiemeEtapeLe) };
});

export async function fermerSession() {
  const jar = await cookies();
  const jeton = jar.get(COOKIE_SESSION)?.value;
  if (jeton) await db.session.deleteMany({ where: { jetonHash: empreinte(jeton) } });
  jar.delete(COOKIE_SESSION);
  jar.delete(COOKIE_ROLES);
}

export class AccesRefuse extends Error {
  constructor() { super('acces_refuse'); }
}

/**
 * Vérifie en base que l'utilisateur connecté a l'un des rôles demandés. Les rôles d'administration
 * exigent la seconde étape (mot de passe + OTP). À appeler dans chaque page et action serveur protégée.
 */
export async function exigerRole(roles: Role[], { rediriger = true }: { rediriger?: boolean } = {}): Promise<SessionCourante> {
  const s = await sessionCourante();
  // Un rôle d'administration ne compte qu'après la seconde étape ; le rôle ACHETEUR suffit d'un OTP.
  const ok = s && s.user.roles.some((r) => roles.includes(r) && (!ROLES_EXIGEANT_MOT_DE_PASSE.includes(r) || s.deuxiemeEtape));
  if (!ok) {
    if (rediriger) redirect(roles.includes('CONTROLEUR') && !roles.includes('AGENT') ? '/admin/connexion?suite=/scan' : '/admin/connexion');
    throw new AccesRefuse();
  }
  return s;
}
