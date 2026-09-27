// Seed de démonstration pour le développement local uniquement.
// Refuse de s'exécuter en production ou sur une base distante. Tout porte le préfixe [DEMO].
import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { db } from '../lib/db';
import { verifierSeedDemoAutorise } from './garde-demo';

const P = '[DEMO] ';
const jour = (n: number, h: number, m = 0) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); d.setUTCHours(h, m, 0, 0); return d; };
const code = () => 'D' + randomBytes(3).toString('hex').toUpperCase().slice(0, 5);

async function main() {
  verifierSeedDemoAutorise(process.env);
  const admin = await db.user.findFirst({ where: { roles: { has: 'SUPERADMIN' } } });
  if (!admin) throw new Error('Lancez d\'abord le seed de production (npm run db:seed).');
  const kin = await db.city.findUniqueOrThrow({ where: { nom: 'Kinshasa' } });
  const goma = await db.city.findUniqueOrThrow({ where: { nom: 'Goma' } });
  const cats = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));

  const orga = await db.organizer.upsert({ where: { slug: 'demo-organisateur' }, update: {}, create: { nom: P + 'Organisateur', slug: 'demo-organisateur', verifie: true } });
  const salle = await db.venue.upsert({ where: { villeId_nom: { villeId: kin.id, nom: P + 'Salle' } }, update: {}, create: { nom: P + 'Salle', villeId: kin.id, adresse: P + 'Adresse' } });
  const esplanade = await db.venue.upsert({ where: { villeId_nom: { villeId: goma.id, nom: P + 'Esplanade' } }, update: {}, create: { nom: P + 'Esplanade', villeId: goma.id } });

  const evenements = [
    { titre: 'Concert', cat: 'concert', lieu: salle, ville: kin, debut: jour(10, 19), types: [['VIP', 150000, 20], ['Standard', 50000, 300]] },
    { titre: 'Match', cat: 'football', lieu: salle, ville: kin, debut: jour(12, 14, 30), types: [['Gradins', 5000, 1000]] },
    { titre: 'Festival', cat: 'festival', lieu: esplanade, ville: goma, debut: jour(20, 12), types: [['Pass journée', 10000, 500]] },
  ] as const;

  for (const e of evenements) {
    const slug = 'demo-' + e.cat;
    if (await db.event.findUnique({ where: { slug } })) continue;
    await db.event.create({
      data: {
        code: code(), slug, titre: P + e.titre, statut: 'PUBLIE', publieLe: new Date(),
        categorieId: cats[e.cat], organisateurId: orga.id, lieuId: e.lieu.id, villeId: e.ville.id, fuseau: e.ville.fuseau,
        debutLe: e.debut, ouverturePortesLe: new Date(e.debut.getTime() - 2 * 3600_000),
        selAffichage: randomBytes(16).toString('hex'), creeParId: admin.id,
        typesBillet: { create: e.types.map(([nom, prixCdf, quota], i) => ({ nom: P + nom, prixCdf, quota, restant: quota, ordre: i })) },
      },
    });
  }
  console.log('Données [DEMO] créées.');
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e instanceof Error ? e.message : e); await db.$disconnect(); process.exit(1); });
