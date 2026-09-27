import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Scanner } from '@/components/scan/Scanner';
import { ROLES_SCAN } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { accesScanner } from '@/lib/scan';

export const dynamic = 'force-dynamic';

const CLES = ['titre', 'telechargement', 'listeRequise', 'enLigne', 'horsLigne', 'entrees', 'signe', 'placer', 'verifierSigne', 'lampe', 'saisir', 'saisirLabel', 'valider', 'motifAttendu', 'motifTexte', 'suivant', 'valide', 'refuse', 'deja', 'dejaTexte', 'inconnu', 'inconnuTexte', 'refuseTexte', 'camera', 'porte'] as const;

export default async function PageScanner({ params }: { params: Promise<{ evenementId: string }> }) {
  const { evenementId } = await params;
  const s = await exigerRole(ROLES_SCAN);
  if (!(await accesScanner(s.user.id, s.user.roles, evenementId))) notFound();
  const affectation = await db.eventController.findUnique({ where: { userId_evenementId: { userId: s.user.id, evenementId } } });
  const t = await getTranslations();
  const textes = { ...Object.fromEntries(CLES.map((k) => [k, t.raw(`scan.${k}`) as string])), reessayer: t('commun.reessayer') } as Parameters<typeof Scanner>[0]['textes'];
  return <Scanner evenementId={evenementId} porte={affectation?.porte ?? null} textes={textes} />;
}
