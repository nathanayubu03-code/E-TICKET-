import { randomBytes } from 'node:crypto';
import { db } from '../../lib/db';

// Création directe de données pour les tests e2e (la base e2e est recréée à chaque lancement).
export async function viderEvenements() {
  // Pas de CASCADE sur Organizer ni User : le super-administrateur du seed doit rester.
  await db.$executeRawUnsafe('TRUNCATE "Scan", "ScannerDevice", "Ticket", "PromoRedemption", "OrderItem", "PaymentEvent", "Payment", "ManualPaymentClaim", "Order", "WaitlistEntry", "EventScheduleItem", "TicketType", "EventController", "Payout", "PromoCode", "Event", "Venue", "SmsLog", "OtpCode", "Session", "RateLimit", "SmsAlertSubscription", "ExchangeRate"');
  await db.user.updateMany({ data: { organisateurId: null } });
  await db.organizer.deleteMany({});
  await db.user.deleteMany({ where: { NOT: { roles: { has: 'SUPERADMIN' } } } });
}

export async function creerEvenement(p: { titre: string; ville?: string; cat?: string; dansJours?: number; types?: { nom: string; prix: number; prixUsd?: number | null; quota: number; restant?: number }[]; statut?: 'PUBLIE' | 'COMPLET' | 'BROUILLON'; slug?: string; sousTitre?: string; genre?: string; description?: string; programme?: { heure: string; titre: string; detail?: string }[] }) {
  const admin = await db.user.findFirstOrThrow({ where: { roles: { has: 'SUPERADMIN' } } });
  const ville = await db.city.findUniqueOrThrow({ where: { nom: p.ville ?? 'Kinshasa' } });
  const cat = await db.category.findUniqueOrThrow({ where: { slug: p.cat ?? 'concert' } });
  const lieu = await db.venue.upsert({ where: { villeId_nom: { villeId: ville.id, nom: 'Salle test ' + ville.nom } }, update: {}, create: { nom: 'Salle test ' + ville.nom, villeId: ville.id } });
  const debut = new Date(Date.now() + (p.dansJours ?? 10) * 86400_000);
  const suffixe = randomBytes(3).toString('hex');
  return db.event.create({
    data: {
      code: 'T' + suffixe.toUpperCase().slice(0, 5), slug: p.slug ?? 'test-' + suffixe, titre: p.titre, sousTitre: p.sousTitre, genre: p.genre, description: p.description,
      programme: p.programme ? { create: p.programme.map((x, i) => ({ ...x, ordre: i })) } : undefined, statut: p.statut ?? 'PUBLIE', publieLe: new Date(),
      categorieId: cat.id, lieuId: lieu.id, villeId: ville.id, fuseau: ville.fuseau, debutLe: debut, ouverturePortesLe: new Date(debut.getTime() - 7200_000),
      selAffichage: randomBytes(16).toString('hex'), creeParId: admin.id,
      typesBillet: { create: (p.types ?? [{ nom: 'Standard', prix: 10000, quota: 100 }]).map((t, i) => ({ nom: t.nom, prixCdf: t.prix, prixUsd: t.prixUsd ?? null, quota: t.quota, restant: t.restant ?? t.quota, ordre: i })) },
    },
    include: { typesBillet: true },
  });
}

/** Dernier code OTP envoyé à ce numéro (le fournisseur SMS de simulation le journalise). */
export async function dernierCode(telephone: string, depuis = new Date(0)): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const sms = await db.smsLog.findFirst({ where: { telephone, gabarit: 'otp', creeLe: { gt: depuis } }, orderBy: { creeLe: 'desc' } });
    const m = sms && /(\d{6})/.exec(sms.contenu);
    if (m) return m[1]!;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Aucun code reçu');
}

export async function connecterAdmin(page: import('@playwright/test').Page, suite = '/admin') {
  await db.otpCode.deleteMany({ where: { telephone: '+243990000001' } });
  await db.rateLimit.deleteMany({});
  const depuis = new Date();
  await page.goto(`/admin/connexion?suite=${encodeURIComponent(suite)}`);
  await page.getByLabel('Numéro').fill('990000001');
  await page.getByLabel('Mot de passe').fill('MotDePasseE2E-tres-long-2026');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByLabel('Code reçu par SMS').fill(await dernierCode('+243990000001', depuis));
  await page.getByRole('button', { name: 'Valider le code' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/admin/connexion') && u.pathname.startsWith(suite));
}

/** Crée un contrôleur affecté à l'événement et le connecte (mot de passe + code SMS). */
export async function connecterControleur(page: import('@playwright/test').Page, evenementId: string, telephone = '+243990000044') {
  const { hacherMotDePasse } = await import('../../lib/auth/motdepasse');
  const user = await db.user.upsert({ where: { telephone }, update: { roles: ['CONTROLEUR'] }, create: { telephone, nom: 'Contrôleur e2e', roles: ['CONTROLEUR'], motDePasse: await hacherMotDePasse('MotDePasseControleur-2026') } });
  await db.eventController.upsert({ where: { userId_evenementId: { userId: user.id, evenementId } }, update: {}, create: { userId: user.id, evenementId, porte: 'B' } });
  await db.rateLimit.deleteMany({});
  const depuis = new Date();
  await page.goto(`/admin/connexion?suite=/scan/${evenementId}`);
  await page.getByLabel('Numéro').fill(telephone.slice(4));
  await page.getByLabel('Mot de passe').fill('MotDePasseControleur-2026');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByLabel('Code reçu par SMS').fill(await dernierCode(telephone, depuis));
  await page.getByRole('button', { name: 'Valider le code' }).click();
  await page.waitForURL((u) => u.pathname === `/scan/${evenementId}`);
}
