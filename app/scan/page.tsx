import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ROLES_SCAN } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ilYA } from '@/lib/temps';
import { dateCourte } from '@/lib/fuseaux';

export const dynamic = 'force-dynamic';

export default async function ChoixScan() {
  const s = await exigerRole(ROLES_SCAN);
  const t = await getTranslations('scan');
  const admin = s.user.roles.some((r) => r === 'SUPERADMIN' || r === 'ADMIN');
  const evts = await db.event.findMany({
    where: { statut: { in: ['PUBLIE', 'COMPLET', 'TERMINE'] }, debutLe: { gte: ilYA(2 * 86400_000) }, ...(admin ? {} : { controleurs: { some: { userId: s.user.id } } }) },
    orderBy: { debutLe: 'asc' }, include: { ville: true, controleurs: { where: { userId: s.user.id } } }, take: 50,
  });
  return (
    <main className="scan-ecran" style={{ padding: 16, gap: 16 }}>
      <h1 className="affiche" style={{ fontSize: 40 }}>{t('titre')}</h1>
      <p>{t('choisir')}</p>
      {evts.length === 0 ? <p className="note note-attention">{t('aucun')}</p> : evts.map((e) => (
        <Link key={e.id} href={`/scan/${e.id}`} className="btn btn-grand" style={{ justifyContent: 'space-between', background: '#1A1813', color: '#FBF5E6', borderColor: '#4A4436' }}>
          <span style={{ textAlign: 'left' }}>{e.titre}<br /><small style={{ fontWeight: 400 }}>{e.debutLe ? dateCourte(e.debutLe, e.ville?.fuseau ?? undefined) : ''}{e.controleurs[0]?.porte ? ` · ${t('porte')} ${e.controleurs[0].porte}` : ''}</small></span>
          <span aria-hidden="true">›</span>
        </Link>
      ))}
    </main>
  );
}
