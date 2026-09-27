// Seed de production. Crée uniquement : le super-administrateur (variables d'environnement),
// les catégories, les villes de référence et les paramètres par défaut. Idempotent.
// --deploiement (lancé par vercel-build) : sans SUPERADMIN_TELEPHONE, le référentiel est créé et le
// super-administrateur est ignoré au lieu de faire échouer le build.
import 'dotenv/config';
import { db } from '../lib/db';
import { hacherMotDePasse, motDePasseFort } from '../lib/auth/motdepasse';
import { CATEGORIES_REFERENCE, PARAMETRES_DEFAUT, VILLES_REFERENCE } from '../lib/referentiel';
import { slugifier } from '../lib/slug';
import { normaliserTelephone } from '../lib/telephone';

async function main() {
  for (const c of CATEGORIES_REFERENCE) {
    await db.category.upsert({ where: { slug: c.slug }, update: { nom: c.nom, icone: c.icone, fond: c.fond, texte: c.texte, ordre: c.ordre }, create: { ...c } });
  }
  for (const v of VILLES_REFERENCE) {
    await db.city.upsert({ where: { nom: v.nom }, update: { fuseau: v.fuseau }, create: { nom: v.nom, slug: slugifier(v.nom), fuseau: v.fuseau } });
  }
  for (const [cle, valeur] of Object.entries(PARAMETRES_DEFAUT)) {
    await db.setting.upsert({ where: { cle }, update: {}, create: { cle, valeur } });
  }

  if (process.argv.includes('--deploiement') && !process.env.SUPERADMIN_TELEPHONE?.trim()) {
    console.log(`Référentiel à jour (${CATEGORIES_REFERENCE.length} catégories, ${VILLES_REFERENCE.length} villes). SUPERADMIN_TELEPHONE vide : aucun super-administrateur créé.`);
    return;
  }
  const telephone = normaliserTelephone(process.env.SUPERADMIN_TELEPHONE ?? '');
  const motDePasse = process.env.SUPERADMIN_MOT_DE_PASSE ?? '';
  if (!telephone) throw new Error('SUPERADMIN_TELEPHONE manquant ou invalide (format +243XXXXXXXXX).');
  if (!motDePasseFort(motDePasse)) throw new Error('SUPERADMIN_MOT_DE_PASSE trop faible : 12 caractères minimum, avec lettres et chiffres.');
  const existant = await db.user.findUnique({ where: { telephone } });
  if (existant) {
    await db.user.update({ where: { telephone }, data: { roles: Array.from(new Set([...existant.roles, 'SUPERADMIN' as const])) } });
    console.log('Super-administrateur déjà présent : rôle vérifié, mot de passe inchangé.');
  } else {
    await db.user.create({ data: { telephone, nom: process.env.SUPERADMIN_NOM || null, roles: ['SUPERADMIN'], motDePasse: await hacherMotDePasse(motDePasse) } });
    await db.auditLog.create({ data: { action: 'seed.superadmin', entite: 'User', apres: { telephone: telephone.slice(0, 6) + '…' } } });
    console.log('Super-administrateur créé.');
  }
  console.log(`${CATEGORIES_REFERENCE.length} catégories, ${VILLES_REFERENCE.length} villes, paramètres par défaut.`);
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e instanceof Error ? e.message : e); await db.$disconnect(); process.exit(1); });
