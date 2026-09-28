import Link from 'next/link';
import { cdf } from '@/lib/argent';
import { exigerRole } from '@/lib/auth/session';
import { db, type StatutPaiement } from '@/lib/db';
import { dateLongue } from '@/lib/fuseaux';
import { infoOperateur } from '@/lib/operateurs';
import { masquerTelephone } from '@/lib/telephone';

export const metadata = { title: 'Paiements' };
const CLASSES: Record<StatutPaiement, string> = { INITIE: 'badge-neutre', EN_ATTENTE: 'badge-attention', REUSSI: 'badge-succes', ECHOUE: 'badge-danger', EXPIRE: 'badge-neutre' };

export default async function JournalPaiements({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigerRole(['SUPERADMIN', 'ADMIN', 'AGENT']);
  const q = (await searchParams).q?.trim();
  const [paiements, aValider, webhooks] = await Promise.all([
    db.payment.findMany({ where: q ? { OR: [{ referenceOperateur: { contains: q } }, { commande: { code: q.toUpperCase() } }] } : {}, orderBy: { creeLe: 'desc' }, take: 100, include: { commande: { select: { code: true } } } }),
    db.manualPaymentClaim.count({ where: { statut: 'EN_ATTENTE' } }),
    db.paymentEvent.findMany({ orderBy: { recuLe: 'desc' }, take: 20 }),
  ]);
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <div className="rangee entre envelopper">
        <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Paiements</h1>
        <Link className="btn btn-principal" href="/admin/paiements/manuels">Paiements manuels à valider ({aValider})</Link>
      </div>
      <form className="rangee" style={{ maxWidth: 480 }}><input name="q" className="champ-texte" placeholder="Référence opérateur ou code de commande" defaultValue={q} /><button className="btn" type="submit">Chercher</button></form>
      {paiements.length === 0 ? <div className="admin-panneau"><p>Aucun paiement pour le moment.</p></div> : (
        <div className="tableau-cadre"><table className="tableau">
          <thead><tr><th>Date</th><th>Commande</th><th>Opérateur</th><th>Numéro</th><th>Montant</th><th>Statut</th><th>Référence</th></tr></thead>
          <tbody>{paiements.map((p) => (
            <tr key={p.id}>
              <td>{dateLongue(p.creeLe)}</td><td><Link href={`/admin/commandes?q=${p.commande.code}`}>{p.commande.code}</Link></td><td>{infoOperateur(p.operateur).nom}</td>
              <td>{masquerTelephone(p.telephone)}</td><td>{cdf(p.montantCdf)}</td>
              <td><span className={`badge ${CLASSES[p.statut]}`}>{p.statut}</span>{p.statutBrut ? <div className="doux" style={{ fontSize: 'var(--t-mini)' }}>{p.statutBrut}</div> : null}</td>
              <td style={{ fontSize: 'var(--t-mini)' }}>{p.referenceOperateur ?? '·'}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <section className="pile" style={{ ['--gap' as string]: '10px' }}>
        <h2 className="titre-section">Derniers webhooks reçus</h2>
        {webhooks.length === 0 ? <p className="doux">Aucun webhook reçu.</p> : (
          <div className="tableau-cadre"><table className="tableau">
            <thead><tr><th>Reçu</th><th>Fournisseur</th><th>Signature</th><th>Traité</th><th>Erreur</th></tr></thead>
            <tbody>{webhooks.map((w) => <tr key={w.id}><td>{dateLongue(w.recuLe)}</td><td>{w.fournisseur}</td><td>{w.signatureValide ? 'Valide' : <b style={{ color: 'var(--danger)' }}>Invalide</b>}</td><td>{w.traiteLe ? 'Oui' : 'Non'}</td><td>{w.erreur ?? '·'}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
