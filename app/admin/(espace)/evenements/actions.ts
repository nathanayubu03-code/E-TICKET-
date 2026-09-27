'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { changerQuota, codeEvenementUnique, dupliquerEvenement, manquesPublication, nouveauSel, QuotaTropBas, slugUnique } from '@/lib/admin/evenements';
import { auditer } from '@/lib/audit';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db, Prisma, type StatutEvenement } from '@/lib/db';
import { localVersUtc } from '@/lib/fuseaux';
import { ipClient } from '@/lib/requete';
import { alerterNouvelEvenement, prevenirListeAttente } from '@/lib/sms/diffusion';
import { deposerOriginal, genererVariantes, type FormatAffiche, type Position } from '@/lib/stockage/affiche';

export interface EtatAction { ok: boolean; message?: string; erreurs?: Record<string, string>; sauveLe?: string }

const texte = (max: number) => z.string().trim().max(max);
const optionnel = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const entier = (min: number, max: number) => z.coerce.number().int().min(min).max(max);
const heureHHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure au format HH:MM');

function erreursZod(e: z.ZodError): Record<string, string> {
  return Object.fromEntries(e.issues.map((i) => [String(i.path[0] ?? 'formulaire'), i.message]));
}
const maintenantTexte = () => new Date().toISOString();

async function marquerBrouillon(id: string) {
  await db.event.update({ where: { id }, data: { brouillonSauveLe: new Date() } });
  revalidatePath(`/admin/evenements/${id}`, 'layout');
}

export async function creerEvenement(_e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const r = z.object({ titre: texte(140).min(2, 'Titre trop court'), categorieId: z.string().min(1, 'Choisissez une catégorie') }).safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: erreursZod(r.error) };
  const e = await db.event.create({
    data: { titre: r.data.titre, categorieId: r.data.categorieId, code: await codeEvenementUnique(), slug: await slugUnique(r.data.titre), selAffichage: nouveauSel(), creeParId: s.user.id, brouillonSauveLe: new Date() },
  });
  await auditer({ acteur: s.user, action: 'evenement.creer', entite: 'Event', entiteId: e.id, apres: { titre: e.titre }, ip: await ipClient() });
  redirect(`/admin/evenements/${e.id}/infos`);
}

const schemaInfos = z.object({
  titre: texte(140).min(2, 'Titre trop court'),
  sousTitre: optionnel(200),
  genre: optionnel(60),
  categorieId: z.string().min(1, 'Choisissez une catégorie'),
  organisateurId: optionnel(40),
  description: optionnel(5000),
});

export async function enregistrerInfos(id: string, _e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const r = schemaInfos.safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: erreursZod(r.error) };
  const avant = await db.event.findUniqueOrThrow({ where: { id } });
  const slug = avant.statut === 'BROUILLON' && avant.titre !== r.data.titre ? await slugUnique(r.data.titre, id) : avant.slug;
  await db.event.update({ where: { id }, data: { ...r.data, slug } });
  await auditer({ acteur: s.user, action: 'evenement.infos', entite: 'Event', entiteId: id, avant: { titre: avant.titre }, apres: r.data });
  await marquerBrouillon(id);
  return { ok: true, sauveLe: maintenantTexte() };
}

const schemaLieu = z.object({
  villeId: z.string().min(1, 'Choisissez une ville'),
  lieuId: z.string().optional(),
  lieuNom: optionnel(140),
  lieuAdresse: optionnel(240),
  latitude: z.string().optional().transform((v) => (v ? Number(v.replace(',', '.')) : null)).refine((v) => v === null || (v >= -14 && v <= 6), 'Latitude hors de la RDC'),
  longitude: z.string().optional().transform((v) => (v ? Number(v.replace(',', '.')) : null)).refine((v) => v === null || (v >= 11 && v <= 32), 'Longitude hors de la RDC'),
  jour: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise').optional().or(z.literal('')),
  portes: heureHHMM.optional().or(z.literal('')),
  debut: heureHHMM.optional().or(z.literal('')),
  fin: heureHHMM.optional().or(z.literal('')),
});

export async function enregistrerLieu(id: string, _e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const r = schemaLieu.safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: erreursZod(r.error) };
  const d = r.data;
  const ville = await db.city.findUniqueOrThrow({ where: { id: d.villeId } });
  let lieuId: string | null = d.lieuId && d.lieuId !== 'nouveau' ? d.lieuId : null;
  if (d.lieuId === 'nouveau') {
    if (!d.lieuNom) return { ok: false, erreurs: { lieuNom: 'Nom du lieu requis' } };
    const lieu = await db.venue.upsert({
      where: { villeId_nom: { villeId: ville.id, nom: d.lieuNom } },
      update: { adresse: d.lieuAdresse, latitude: d.latitude, longitude: d.longitude },
      create: { villeId: ville.id, nom: d.lieuNom, adresse: d.lieuAdresse, latitude: d.latitude, longitude: d.longitude },
    });
    lieuId = lieu.id;
  } else if (lieuId) {
    const lieu = await db.venue.findUnique({ where: { id: lieuId } });
    if (!lieu || lieu.villeId !== ville.id) lieuId = null;
    else if (d.lieuAdresse !== undefined || d.latitude !== null) await db.venue.update({ where: { id: lieuId }, data: { adresse: d.lieuAdresse, latitude: d.latitude, longitude: d.longitude } });
  }
  const conv = (h?: string) => (d.jour && h ? localVersUtc(d.jour, h, ville.fuseau) : null);
  const debutLe = conv(d.debut);
  let finLe = conv(d.fin);
  if (debutLe && finLe && finLe <= debutLe) finLe = new Date(finLe.getTime() + 86400_000); // fin après minuit
  await db.event.update({ where: { id }, data: { villeId: ville.id, fuseau: ville.fuseau, lieuId, debutLe, ouverturePortesLe: conv(d.portes), finLe } });
  await auditer({ acteur: s.user, action: 'evenement.lieu_date', entite: 'Event', entiteId: id, apres: { ville: ville.nom, lieuId, debutLe } });
  await marquerBrouillon(id);
  return { ok: true, sauveLe: maintenantTexte() };
}

const schemaType = z.object({
  nom: texte(80).min(1, 'Nom requis'),
  description: optionnel(200),
  prixCdf: entier(0, 100_000_000),
  quota: entier(1, 1_000_000),
  venteDebut: z.string().optional(),
  venteFin: z.string().optional(),
  limiteParCommande: z.string().optional().transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 50), 'Entre 1 et 50'),
  ordre: entier(0, 1000).default(0),
});

async function dateVente(evenementId: string, valeur?: string): Promise<Date | null> {
  if (!valeur) return null;
  const [jour, heure] = valeur.split('T');
  if (!jour || !heure) return null;
  const e = await db.event.findUniqueOrThrow({ where: { id: evenementId }, select: { fuseau: true } });
  return localVersUtc(jour, heure.slice(0, 5), e.fuseau ?? 'Africa/Kinshasa');
}

export async function enregistrerTypeBillet(evenementId: string, typeId: string | null, _e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const r = schemaType.safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: erreursZod(r.error) };
  const { quota, venteDebut, venteFin, ...reste } = r.data;
  const data = { ...reste, venteDebutLe: await dateVente(evenementId, venteDebut), venteFinLe: await dateVente(evenementId, venteFin) };
  try {
    if (typeId) {
      await db.$transaction(async (tx) => {
        await tx.ticketType.update({ where: { id: typeId, evenementId }, data });
        await changerQuota(tx, typeId, quota);
      });
    } else {
      await db.ticketType.create({ data: { ...data, evenementId, quota, restant: quota } });
    }
  } catch (e) {
    if (e instanceof QuotaTropBas) return { ok: false, erreurs: { quota: e.message } };
    throw e;
  }
  await auditer({ acteur: s.user, action: typeId ? 'billet.modifier' : 'billet.ajouter', entite: 'TicketType', entiteId: typeId, apres: { evenementId, ...r.data } });
  await marquerBrouillon(evenementId);
  return { ok: true, sauveLe: maintenantTexte() };
}

export async function supprimerTypeBillet(evenementId: string, typeId: string): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const ventes = await db.orderItem.count({ where: { typeBilletId: typeId } });
  if (ventes > 0) return { ok: false, message: 'Cette catégorie a déjà des commandes : elle ne peut pas être supprimée. Mettez son quota au nombre de places vendues pour arrêter la vente.' };
  await db.ticketType.delete({ where: { id: typeId, evenementId } });
  await auditer({ acteur: s.user, action: 'billet.supprimer', entite: 'TicketType', entiteId: typeId, avant: { evenementId } });
  await marquerBrouillon(evenementId);
  return { ok: true };
}

const schemaProgramme = z.object({ heure: heureHHMM, titre: texte(120).min(1, 'Titre requis'), detail: optionnel(200), ordre: entier(0, 1000).default(0) });

export async function enregistrerLigneProgramme(evenementId: string, ligneId: string | null, _e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const r = schemaProgramme.safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: erreursZod(r.error) };
  if (ligneId) await db.eventScheduleItem.update({ where: { id: ligneId, evenementId }, data: r.data });
  else await db.eventScheduleItem.create({ data: { ...r.data, evenementId } });
  await auditer({ acteur: s.user, action: 'programme.enregistrer', entite: 'Event', entiteId: evenementId, apres: r.data });
  await marquerBrouillon(evenementId);
  return { ok: true, sauveLe: maintenantTexte() };
}

export async function supprimerLigneProgramme(evenementId: string, ligneId: string): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  await db.eventScheduleItem.delete({ where: { id: ligneId, evenementId } });
  await auditer({ acteur: s.user, action: 'programme.supprimer', entite: 'Event', entiteId: evenementId });
  await marquerBrouillon(evenementId);
  return { ok: true };
}

export async function enregistrerPratique(id: string, _e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const r = z.object({
    infosPratiques: optionnel(3000),
    limiteParPersonne: z.string().optional().transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 20), 'Entre 1 et 20'),
  }).safeParse(Object.fromEntries(formData));
  if (!r.success) return { ok: false, erreurs: erreursZod(r.error) };
  await db.event.update({ where: { id }, data: r.data });
  await auditer({ acteur: s.user, action: 'evenement.pratique', entite: 'Event', entiteId: id, apres: r.data });
  await marquerBrouillon(id);
  return { ok: true, sauveLe: maintenantTexte() };
}

export async function televerserAffiche(id: string, _e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const fichier = formData.get('affiche');
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: false, erreurs: { affiche: 'Choisissez une image.' } };
  try {
    const cle = await deposerOriginal(id, fichier);
    const variantes = await genererVariantes(cle);
    await db.event.update({ where: { id }, data: { afficheCle: cle, afficheVariantes: variantes as object } });
  } catch (e) {
    return { ok: false, erreurs: { affiche: e instanceof Error ? e.message : 'Image illisible.' } };
  }
  await auditer({ acteur: s.user, action: 'evenement.affiche', entite: 'Event', entiteId: id });
  await marquerBrouillon(id);
  return { ok: true, sauveLe: maintenantTexte() };
}

export async function recadrerAffiche(id: string, _e: EtatAction, formData: FormData): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const pos = z.enum(['top', 'centre', 'bottom', 'attention']);
  const r = z.object({ '4x5': pos, '16x9': pos }).safeParse(Object.fromEntries(formData));
  const e = await db.event.findUniqueOrThrow({ where: { id } });
  if (!r.success || !e.afficheCle) return { ok: false, message: 'Aucune affiche à recadrer.' };
  const variantes = await genererVariantes(e.afficheCle, r.data as Record<FormatAffiche, Position>);
  await db.event.update({ where: { id }, data: { afficheVariantes: variantes as object } });
  await auditer({ acteur: s.user, action: 'evenement.recadrage', entite: 'Event', entiteId: id, apres: r.data });
  await marquerBrouillon(id);
  return { ok: true, sauveLe: maintenantTexte() };
}

export async function retirerAffiche(id: string): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  await db.event.update({ where: { id }, data: { afficheCle: null, afficheVariantes: Prisma.DbNull } });
  await auditer({ acteur: s.user, action: 'evenement.affiche_retiree', entite: 'Event', entiteId: id });
  await marquerBrouillon(id);
  return { ok: true };
}

const TRANSITIONS: Record<StatutEvenement, StatutEvenement[]> = {
  BROUILLON: ['PUBLIE', 'ANNULE'],
  A_VALIDER: ['PUBLIE', 'BROUILLON', 'ANNULE'],
  PUBLIE: ['COMPLET', 'ANNULE', 'TERMINE', 'BROUILLON'],
  COMPLET: ['PUBLIE', 'ANNULE', 'TERMINE'],
  ANNULE: [],
  TERMINE: [],
};

export async function changerStatut(id: string, cible: StatutEvenement): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const e = await db.event.findUniqueOrThrow({ where: { id }, include: { typesBillet: true } });
  if (!TRANSITIONS[e.statut].includes(cible)) return { ok: false, message: `Passage de ${e.statut} à ${cible} impossible.` };
  if (cible === 'PUBLIE') {
    const manques = manquesPublication(e);
    if (manques.length) return { ok: false, message: `Il manque : ${manques.join(', ')}.` };
  }
  if (cible === 'BROUILLON' && (await db.order.count({ where: { evenementId: id, statut: { in: ['PAYEE', 'EN_ATTENTE'] } } })) > 0) {
    return { ok: false, message: "Cet événement a des commandes : il ne peut pas repasser en brouillon. Annulez-le si nécessaire." };
  }
  await db.event.update({ where: { id }, data: { statut: cible, ...(cible === 'PUBLIE' && !e.publieLe ? { publieLe: new Date() } : {}) } });
  await auditer({ acteur: s.user, action: 'evenement.statut', entite: 'Event', entiteId: id, avant: { statut: e.statut }, apres: { statut: cible } });
  // Première publication : alerte SMS des abonnés, après la réponse pour ne pas faire attendre l'administrateur.
  if (cible === 'PUBLIE' && !e.publieLe) after(() => alerterNouvelEvenement(id));
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Statut mis à jour.' };
}

export async function dupliquer(id: string) {
  const s = await exigerRole(ROLES_EDITION);
  const copie = await dupliquerEvenement(id, s.user.id);
  await auditer({ acteur: s.user, action: 'evenement.dupliquer', entite: 'Event', entiteId: copie.id, avant: { source: id } });
  redirect(`/admin/evenements/${copie.id}/infos`);
}

export async function archiver(id: string, archive: boolean) {
  const s = await exigerRole(ROLES_EDITION);
  await db.event.update({ where: { id }, data: { archiveLe: archive ? new Date() : null } });
  await auditer({ acteur: s.user, action: archive ? 'evenement.archiver' : 'evenement.desarchiver', entite: 'Event', entiteId: id });
  revalidatePath('/admin/evenements');
}


export async function prevenirAttente(id: string): Promise<EtatAction> {
  const s = await exigerRole(ROLES_EDITION);
  const n = await prevenirListeAttente(id, s.user);
  return { ok: true, message: n ? `${n} SMS envoyé${n > 1 ? 's' : ''}.` : 'Personne à prévenir.' };
}
