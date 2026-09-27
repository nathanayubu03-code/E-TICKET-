import { db } from '@/lib/db';
import { CATEGORIES_REFERENCE, PARAMETRES_DEFAUT, VILLES_REFERENCE } from '@/lib/referentiel';
import { slugifier } from '@/lib/slug';

// Vide toutes les tables sauf le journal d'audit (non modifiable par conception).
export async function viderBase() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('AuditLog', '_prisma_migrations')`;
  const liste = tables.map((t) => `"${t.tablename}"`).join(', ');
  if (liste) await db.$executeRawUnsafe(`TRUNCATE ${liste} RESTART IDENTITY CASCADE`);
}

export async function referentiel() {
  for (const c of CATEGORIES_REFERENCE) await db.category.upsert({ where: { slug: c.slug }, update: {}, create: { ...c } });
  for (const v of VILLES_REFERENCE) await db.city.upsert({ where: { nom: v.nom }, update: {}, create: { nom: v.nom, slug: slugifier(v.nom), fuseau: v.fuseau } });
  for (const [cle, valeur] of Object.entries(PARAMETRES_DEFAUT)) await db.setting.upsert({ where: { cle }, update: {}, create: { cle, valeur } });
}
