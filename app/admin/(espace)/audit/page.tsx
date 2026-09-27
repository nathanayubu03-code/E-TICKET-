import Link from 'next/link';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { dateLongue } from '@/lib/fuseaux';
import { masquerTelephone } from '@/lib/telephone';

export const metadata = { title: "Journal d'audit" };
const PAR_PAGE = 50;

export default async function Audit({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  await exigerRole(['SUPERADMIN', 'ADMIN']);
  const { action = '', page = '1' } = await searchParams;
  const n = Math.max(1, Number(page) || 1);
  const where = action ? { action: { startsWith: action } } : {};
  const [lignes, total] = await Promise.all([db.auditLog.findMany({ where, orderBy: { id: 'desc' }, take: PAR_PAGE, skip: (n - 1) * PAR_PAGE }), db.auditLog.count({ where })]);
  const acteurs = new Map((await db.user.findMany({ where: { id: { in: lignes.map((l) => l.acteurId).filter((x): x is string => Boolean(x)) } }, select: { id: true, nom: true, telephone: true } })).map((u) => [u.id, u.nom ?? masquerTelephone(u.telephone)]));
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <h1 className="affiche" style={{ fontSize: 44 }}>Journal d&apos;audit</h1>
      <p className="doux">Non modifiable : la base refuse toute modification ou suppression de ce journal.</p>
      <form className="rangee" style={{ maxWidth: 420 }}><input name="action" className="champ-texte" placeholder="Action (ex. evenement., paiement.)" defaultValue={action} /><button className="btn" type="submit">Filtrer</button></form>
      {lignes.length === 0 ? <div className="admin-panneau"><p>Aucune entrée.</p></div> : (
        <div className="tableau-cadre"><table className="tableau">
          <thead><tr><th>Quand</th><th>Qui</th><th>Action</th><th>Objet</th><th>Détail</th></tr></thead>
          <tbody>{lignes.map((l) => (
            <tr key={String(l.id)}><td>{dateLongue(l.creeLe)}</td><td>{l.acteurId ? acteurs.get(l.acteurId) ?? l.acteurId : 'Système'}{l.acteurRole ? <div className="doux" style={{ fontSize: 12 }}>{l.acteurRole}</div> : null}</td><td>{l.action}</td><td>{l.entite}{l.entiteId ? <div className="doux" style={{ fontSize: 12 }}>{l.entiteId}</div> : null}</td>
              <td style={{ fontSize: 12, maxWidth: 380, wordBreak: 'break-word' }}>{l.apres ? JSON.stringify(l.apres).slice(0, 300) : ''}</td></tr>
          ))}</tbody>
        </table></div>
      )}
      <div className="rangee">
        {n > 1 ? <Link className="btn" href={`/admin/audit?action=${encodeURIComponent(action)}&page=${n - 1}`}>Plus récents</Link> : null}
        {n * PAR_PAGE < total ? <Link className="btn" href={`/admin/audit?action=${encodeURIComponent(action)}&page=${n + 1}`}>Plus anciens</Link> : null}
      </div>
    </div>
  );
}
