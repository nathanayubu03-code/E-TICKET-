import type { Role } from '@/lib/db';

export const ROLES_ADMIN: Role[] = ['SUPERADMIN', 'ADMIN', 'AGENT', 'ORGANISATEUR'];
export const ROLES_SCAN: Role[] = ['SUPERADMIN', 'ADMIN', 'CONTROLEUR'];
export const ROLES_EXIGEANT_MOT_DE_PASSE: Role[] = ['SUPERADMIN', 'ADMIN', 'AGENT', 'ORGANISATEUR', 'CONTROLEUR'];

/** Zones de l'administration et rôles autorisés (le premier préfixe qui correspond s'applique). */
export const ACCES_ADMIN: { prefixe: string; roles: Role[] }[] = [
  { prefixe: '/admin/parametres', roles: ['SUPERADMIN', 'ADMIN'] },
  { prefixe: '/admin/audit', roles: ['SUPERADMIN', 'ADMIN'] },
  { prefixe: '/admin/controleurs', roles: ['SUPERADMIN', 'ADMIN'] },
  { prefixe: '/admin/promos', roles: ['SUPERADMIN', 'ADMIN'] },
  { prefixe: '/admin/organisateurs', roles: ['SUPERADMIN', 'ADMIN'] },
  { prefixe: '/admin/paiements', roles: ['SUPERADMIN', 'ADMIN', 'AGENT'] },
  { prefixe: '/admin/commandes', roles: ['SUPERADMIN', 'ADMIN', 'AGENT'] },
  { prefixe: '/admin/reversements', roles: ['SUPERADMIN', 'ADMIN', 'ORGANISATEUR'] },
  { prefixe: '/admin/evenements', roles: ['SUPERADMIN', 'ADMIN', 'ORGANISATEUR'] },
  { prefixe: '/admin', roles: ['SUPERADMIN', 'ADMIN', 'AGENT', 'ORGANISATEUR'] },
];

export function rolesPourChemin(chemin: string): Role[] | null {
  return ACCES_ADMIN.find((a) => chemin === a.prefixe || chemin.startsWith(a.prefixe + '/'))?.roles ?? null;
}

export const aUnRole = (roles: readonly string[], autorises: readonly string[]) => roles.some((r) => autorises.includes(r));

/** Rôles qui peuvent modifier (l'organisateur ne fait que lire au MVP). */
export const ROLES_EDITION: Role[] = ['SUPERADMIN', 'ADMIN'];
