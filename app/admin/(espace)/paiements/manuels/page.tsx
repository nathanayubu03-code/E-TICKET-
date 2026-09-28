import { ActionsReclamation } from '@/components/admin/ActionsReclamation';
import { cdf } from '@/lib/argent';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { dateLongue } from '@/lib/fuseaux';
import { infoOperateur } from '@/lib/operateurs';
import { formaterTelephone } from '@/lib/telephone';
import { refuser, valider } from '../actions';

export const metadata = { title: 'Paiements manuels' };

export default async function PaiementsManuels() {
  await exigerRole(['SUPERADMIN', 'ADMIN', 'AGENT']);
  const [aTraiter, traites] = await Promise.all([
    db.manualPaymentClaim.findMany({ where: { statut: 'EN_ATTENTE' }, orderBy: { creeLe: 'asc' }, include: { commande: { select: { code: true, totalCdf: true, evenement: { select: { titre: true } } } } } }),
    db.manualPaymentClaim.findMany({ where: { statut: { not: 'EN_ATTENTE' } }, orderBy: { traiteLe: 'desc' }, take: 30, include: { commande: { select: { code: true } } } }),
  ]);
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Paiements manuels à valider</h1>
      <p className="doux">Vérifiez dans le relevé du compte marchand que le montant exact est arrivé avec cette référence avant de valider. Une référence ne peut servir qu&apos;une fois.</p>
      {aTraiter.length === 0 ? <div className="admin-panneau"><p>Aucun paiement manuel en attente.</p></div> : (
        <div className="tableau-cadre"><table className="tableau">
          <thead><tr><th>Déclaré</th><th>Commande</th><th>Opérateur</th><th>Référence</th><th>Payé depuis</th><th>Montant attendu</th><th>Décision</th></tr></thead>
          <tbody>{aTraiter.map((r) => (
            <tr key={r.id}>
              <td>{dateLongue(r.creeLe)}</td><td><b>{r.commande.code}</b><div className="doux" style={{ fontSize: 'var(--t-mini)' }}>{r.commande.evenement.titre}</div></td>
              <td>{infoOperateur(r.operateur).nom}</td><td><b style={{ letterSpacing: '0.04em' }}>{r.referenceTransaction}</b></td>
              <td>{formaterTelephone(r.telephonePayeur)}</td><td>{cdf(r.montantCdf)}</td>
              <td style={{ minWidth: 200 }}><ActionsReclamation valider={valider.bind(null, r.id)} refuser={refuser.bind(null, r.id)} /></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <h2 className="titre-section">Derniers traités</h2>
      {traites.length === 0 ? <p className="doux">Aucun.</p> : (
        <div className="tableau-cadre"><table className="tableau">
          <thead><tr><th>Traité</th><th>Commande</th><th>Référence</th><th>Décision</th></tr></thead>
          <tbody>{traites.map((r) => <tr key={r.id}><td>{r.traiteLe ? dateLongue(r.traiteLe) : '·'}</td><td>{r.commande.code}</td><td>{r.referenceTransaction}</td><td>{r.statut === 'VALIDEE' ? 'Validé' : `Refusé : ${r.motifRefus ?? ''}`}</td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}
