import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EtapesAssistant } from '@/components/admin/EtapesAssistant';
import { CLASSES_STATUT, LIBELLES_STATUT } from '@/lib/admin/libelles';
import { ROLES_ADMIN } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { dateLongue } from '@/lib/fuseaux';

export default async function LayoutEvenement({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const s = await exigerRole(ROLES_ADMIN);
  const { id } = await params;
  const e = await db.event.findUnique({ where: { id }, select: { id: true, titre: true, statut: true, slug: true, brouillonSauveLe: true, organisateurId: true, code: true } });
  if (!e) notFound();
  if (!s.user.roles.some((r) => r === 'SUPERADMIN' || r === 'ADMIN') && e.organisateurId !== s.user.organisateurId) notFound();
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <Link href="/admin/evenements" className="lien-bouton">Tous les événements</Link>
      <div className="rangee entre envelopper">
        <div className="pile" style={{ ['--gap' as string]: '6px' }}>
          <h1 className="affiche" style={{ fontSize: 40 }}>{e.titre}</h1>
          <div className="rangee envelopper" style={{ ['--gap' as string]: '10px' }}>
            <span className={`badge ${CLASSES_STATUT[e.statut]}`}>{LIBELLES_STATUT[e.statut]}</span>
            <span className="doux" style={{ fontSize: 14 }}>Code {e.code}</span>
            {e.brouillonSauveLe ? <span className="doux" style={{ fontSize: 14 }}>Dernière modification le {dateLongue(e.brouillonSauveLe)}</span> : null}
          </div>
        </div>
        {e.statut === 'PUBLIE' || e.statut === 'COMPLET' ? <Link className="btn" href={`/evenements/${e.slug}`} target="_blank">Voir la page publique</Link> : null}
      </div>
      <EtapesAssistant id={e.id} />
      {children}
    </div>
  );
}
