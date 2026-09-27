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

export async function creerEvenement(p: { titre: string; ville?: string; cat?: string; dansJours?: number; types?: { nom: string; prix: number; quota: number; restant?: number }[]; statut?: 'PUBLIE' | 'COMPLET' | 'BROUILLON'; slug?: string; sousTitre?: string; genre?: string; description?: string; programme?: { heure: string; titre: string; detail?: string }[] }) {
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
      typesBillet: { create: (p.types ?? [{ nom: 'Standard', prix: 10000, quota: 100 }]).map((t, i) => ({ nom: t.nom, prixCdf: t.prix, quota: t.quota, restant: t.restant ?? t.quota, ordre: i })) },
    },
    include: { typesBillet: true },
  });
}
