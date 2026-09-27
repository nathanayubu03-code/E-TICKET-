import Link from 'next/link';
import { BoutonAction } from '@/components/admin/BoutonAction';
import { CLASSES_STATUT, LIBELLES_STATUT } from '@/lib/admin/libelles';
import { aUnRole, ROLES_ADMIN, ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db, type Prisma, type StatutEvenement } from '@/lib/db';
import { dateCourte } from '@/lib/fuseaux';
import { archiver, dupliquer } from './actions';

export const metadata = { title: 'Événements' };
const STATUTS: StatutEvenement[] = ['BROUILLON', 'A_VALIDER', 'PUBLIE', 'COMPLET', 'ANNULE', 'TERMINE'];

export default async function ListeEvenements({ searchParams }: { searchParams: Promise<{ statut?: string; archives?: string }> }) {
  const s = await exigerRole(ROLES_ADMIN);
  const edition = aUnRole(s.user.roles, ROLES_EDITION);
  const { statut, archives } = await searchParams;
  const filtre = STATUTS.includes(statut as StatutEvenement) ? (statut as StatutEvenement) : undefined;
  const where: Prisma.EventWhereInput = {
    ...(filtre ? { statut: filtre } : {}),
    archiveLe: archives ? { not: null } : null,
    ...(!edition ? { organisateurId: s.user.organisateurId ?? '__aucun__' } : {}),
  };
  const evts = await db.event.findMany({ where, orderBy: [{ debutLe: 'desc' }, { creeLe: 'desc' }], include: { ville: true, typesBillet: { select: { quota: true, restant: true } } }, take: 200 });
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <div className="rangee entre envelopper">
        <h1 className="affiche" style={{ fontSize: 44 }}>Événements</h1>
        {edition ? <Link className="btn btn-principal" href="/admin/evenements/nouveau">Créer un événement</Link> : null}
      </div>
      <nav className="onglets-admin" aria-label="Filtrer par statut">
        <Link href="/admin/evenements" aria-current={!filtre && !archives ? 'page' : undefined}>Tous</Link>
        {STATUTS.map((st) => <Link key={st} href={`/admin/evenements?statut=${st}`} aria-current={filtre === st ? 'page' : undefined}>{LIBELLES_STATUT[st]}</Link>)}
        <Link href="/admin/evenements?archives=1" aria-current={archives ? 'page' : undefined}>Archivés</Link>
      </nav>
      {evts.length === 0 ? (
        <div className="admin-panneau"><p>Aucun événement {filtre ? `au statut « ${LIBELLES_STATUT[filtre]} »` : archives ? 'archivé' : 'pour le moment'}.</p></div>
      ) : (
        <div className="tableau-cadre">
          <table className="tableau">
            <thead><tr><th>Événement</th><th>Date</th><th>Ville</th><th>Statut</th><th>Places vendues</th><th>Actions</th></tr></thead>
            <tbody>
              {evts.map((e) => {
                const quota = e.typesBillet.reduce((a, t) => a + t.quota, 0);
                const vendus = e.typesBillet.reduce((a, t) => a + t.quota - t.restant, 0);
                return (
                  <tr key={e.id}>
                    <td><Link href={`/admin/evenements/${e.id}/infos`}><b>{e.titre}</b></Link><div className="doux" style={{ fontSize: 13 }}>{e.code}</div></td>
                    <td>{e.debutLe ? dateCourte(e.debutLe, e.fuseau ?? undefined) : '·'}</td>
                    <td>{e.ville?.nom ?? '·'}</td>
                    <td><span className={`badge ${CLASSES_STATUT[e.statut]}`}>{LIBELLES_STATUT[e.statut]}</span></td>
                    <td>{vendus} / {quota}</td>
                    <td>
                      {edition ? (
                        <div className="rangee envelopper" style={{ ['--gap' as string]: '6px' }}>
                          <BoutonAction classe="lien-bouton" libelle="Dupliquer" action={dupliquer.bind(null, e.id)} />
                          <BoutonAction classe="lien-bouton" libelle={e.archiveLe ? 'Désarchiver' : 'Archiver'} confirmation={e.archiveLe ? undefined : 'Archiver cet événement ? Il disparaîtra des listes et du site.'} action={archiver.bind(null, e.id, !e.archiveLe)} />
                        </div>
                      ) : <Link href={`/admin/evenements/${e.id}/apercu`}>Voir</Link>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
