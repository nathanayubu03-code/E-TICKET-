'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auditer } from '@/lib/audit';
import { hacherMotDePasse, motDePasseFort } from '@/lib/auth/motdepasse';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { chiffrer } from '@/lib/chiffrement';
import { db } from '@/lib/db';
import { BORNES_COMMISSION_BPS } from '@/lib/referentiel';
import { slugifier } from '@/lib/slug';
import { normaliserTelephone } from '@/lib/telephone';

export interface EtatAction { ok: boolean; message?: string; erreurs?: Record<string, string>; sauveLe?: string }

const schema = z.object({
  nom: z.string().trim().min(2, 'Nom requis').max(120),
  contactNom: z.string().trim().max(120).optional(),
  telephone: z.string().optional(),
  email: z.union([z.literal(''), z.email('E-mail invalide')]).optional(),
  reversementOperateur: z.enum(['', 'MPESA', 'AIRTEL', 'ORANGE', 'AFRIMONEY']).optional(),
  reversementNumero: z.string().optional(),
  commission: z.string().optional(),
  verifie: z.string().optional(),
});

export async function enregistrerOrganisateur(id: string | null, _e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const r = schema.safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const d = r.data;
  const erreurs: Record<string, string> = {};
  const telephone = d.telephone ? normaliserTelephone(d.telephone) : null;
  if (d.telephone && !telephone) erreurs.telephone = 'Numéro invalide';
  const reversement = d.reversementNumero ? normaliserTelephone(d.reversementNumero) : null;
  if (d.reversementNumero && !reversement) erreurs.reversementNumero = 'Numéro invalide';
  let commissionBps: number | null = null;
  if (d.commission) {
    const pct = Number(d.commission.replace(',', '.'));
    commissionBps = Math.round(pct * 100);
    if (!Number.isFinite(pct) || commissionBps < BORNES_COMMISSION_BPS.min || commissionBps > BORNES_COMMISSION_BPS.max) erreurs.commission = 'Entre 0 et 30 %';
  }
  if (Object.keys(erreurs).length) return { ok: false, erreurs };
  const data = {
    nom: d.nom, contactNom: d.contactNom || null, telephone, email: d.email || null,
    reversementOperateur: d.reversementOperateur || null, commissionBps,
    ...(reversement ? { reversementNumeroChiffre: chiffrer(reversement), reversementNumeroFin: reversement.slice(-3) } : {}),
  };
  const verifie = d.verifie === 'oui';
  let organisateurId = id;
  if (id) {
    const avant = await db.organizer.findUniqueOrThrow({ where: { id } });
    await db.organizer.update({ where: { id }, data: { ...data, verifie, ...(verifie && !avant.verifie ? { verifieLe: new Date(), verifieParId: s.user.id } : {}) } });
    await auditer({ acteur: s.user, action: 'organisateur.modifier', entite: 'Organizer', entiteId: id, avant: { nom: avant.nom, verifie: avant.verifie, commissionBps: avant.commissionBps }, apres: { nom: data.nom, verifie, commissionBps, reversementModifie: Boolean(reversement) } });
  } else {
    let slug = slugifier(d.nom) || 'organisateur';
    if (await db.organizer.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const o = await db.organizer.create({ data: { ...data, slug, verifie, ...(verifie ? { verifieLe: new Date(), verifieParId: s.user.id } : {}) } });
    organisateurId = o.id;
    await auditer({ acteur: s.user, action: 'organisateur.creer', entite: 'Organizer', entiteId: o.id, apres: { nom: o.nom } });
  }
  revalidatePath('/admin/organisateurs');
  if (!id) redirect(`/admin/organisateurs/${organisateurId}`);
  return { ok: true, sauveLe: new Date().toISOString() };
}

/** Compte de lecture pour l'organisateur (ventes et reversements de ses événements). */
export async function creerAccesOrganisateur(organisateurId: string, _e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const telephone = normaliserTelephone(String(formData.get('telephone') ?? ''));
  const motDePasse = String(formData.get('motDePasse') ?? '');
  if (!telephone) return { ok: false, erreurs: { telephone: 'Numéro invalide' } };
  if (!motDePasseFort(motDePasse)) return { ok: false, erreurs: { motDePasse: '12 caractères minimum, avec lettres et chiffres' } };
  const existant = await db.user.findUnique({ where: { telephone } });
  if (existant && existant.roles.some((r) => r === 'SUPERADMIN' || r === 'ADMIN')) return { ok: false, erreurs: { telephone: 'Ce numéro est un compte administrateur.' } };
  const roles = Array.from(new Set([...(existant?.roles ?? []), 'ORGANISATEUR' as const]));
  const user = await db.user.upsert({ where: { telephone }, update: { roles, organisateurId, motDePasse: await hacherMotDePasse(motDePasse) }, create: { telephone, roles, organisateurId, motDePasse: await hacherMotDePasse(motDePasse) } });
  await auditer({ acteur: s.user, action: 'organisateur.acces', entite: 'User', entiteId: user.id, apres: { organisateurId } });
  revalidatePath(`/admin/organisateurs/${organisateurId}`);
  return { ok: true, message: 'Accès créé. Donnez le mot de passe à l’organisateur en main propre.' };
}

export async function archiverOrganisateur(id: string) {
  const s = await exigerRole(ROLES_EDITION);
  await db.organizer.update({ where: { id }, data: { archiveLe: new Date() } });
  await auditer({ acteur: s.user, action: 'organisateur.archiver', entite: 'Organizer', entiteId: id });
  redirect('/admin/organisateurs');
}
