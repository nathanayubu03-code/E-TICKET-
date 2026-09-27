import Link from 'next/link';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const metadata = { title: 'Organisateurs' };

export default async function ListeOrganisateurs() {
  await exigerRole(ROLES_EDITION);
  const orgas = await db.organizer.findMany({ where: { archiveLe: null }, orderBy: { nom: 'asc' }, include: { _count: { select: { evenements: true } } } });
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <div className="rangee entre envelopper">
        <h1 className="affiche" style={{ fontSize: 44 }}>Organisateurs</h1>
        <Link className="btn btn-principal" href="/admin/organisateurs/nouveau">Ajouter un organisateur</Link>
      </div>
      {orgas.length === 0 ? <div className="admin-panneau"><p>Aucun organisateur pour le moment.</p></div> : (
        <div className="tableau-cadre">
          <table className="tableau">
            <thead><tr><th>Nom</th><th>Contact</th><th>Commission</th><th>Événements</th><th>Vérifié</th></tr></thead>
            <tbody>{orgas.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/organisateurs/${o.id}`}><b>{o.nom}</b></Link></td>
                <td>{o.contactNom ?? '·'}</td>
                <td>{o.commissionBps === null ? 'Taux global' : `${o.commissionBps / 100} %`}</td>
                <td>{o._count.evenements}</td>
                <td>{o.verifie ? <span className="badge badge-info">Vérifié</span> : '·'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
