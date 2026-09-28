import Link from 'next/link';
import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { reversementsDus } from '@/lib/admin/stats';
import { cdf } from '@/lib/argent';
import { aUnRole, ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { dateCourte, dateLongue } from '@/lib/fuseaux';
import { infoOperateur, OPERATEURS } from '@/lib/operateurs';
import { enregistrerReversement } from './actions';

export const metadata = { title: 'Reversements' };

export default async function Reversements() {
  const s = await exigerRole(['SUPERADMIN', 'ADMIN', 'ORGANISATEUR']);
  const edition = aUnRole(s.user.roles, ROLES_EDITION);
  const lignes = await reversementsDus(edition ? undefined : s.user.organisateurId ?? '__aucun__');
  const historique = await db.payout.findMany({ where: edition ? {} : { organisateurId: s.user.organisateurId ?? '__aucun__' }, orderBy: { effectueLe: 'desc' }, take: 50, include: { evenement: { select: { titre: true } }, organisateur: { select: { nom: true } } } });
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Reversements</h1>
      <p className="doux">Tout l&apos;argent arrive sur le compte marchand d&apos;e-Ticket. Le net dû à l&apos;organisateur est la somme des commandes payées moins la commission figée sur chaque commande.</p>
      {lignes.length === 0 ? <div className="admin-panneau"><p>Aucune vente, donc aucun reversement dû.</p></div> : lignes.map((l) => (
        <section key={l.id} className="admin-panneau pile" aria-label={l.titre}>
          <div className="rangee entre envelopper">
            <div><h2 className="titre-section" style={{ fontSize: 'var(--t-titre-carte)' }}>{l.titre}</h2><span className="doux">{l.organisateur?.nom}{l.debutLe ? ` · ${dateCourte(l.debutLe, l.fuseau ?? undefined)}` : ''}</span></div>
            <a className="btn" href={`/api/exports/evenements/${l.id}`}>Exporter en Excel</a>
          </div>
          <div className="kpis">
            <div className="kpi"><span className="doux">Brut</span><b>{cdf(l.brut, '0 CDF')}</b></div>
            <div className="kpi"><span className="doux">Commission</span><b>{cdf(l.commission, '0 CDF')}</b></div>
            <div className="kpi"><span className="doux">Net organisateur</span><b>{cdf(l.net, '0 CDF')}</b></div>
            <div className="kpi"><span className="doux">Déjà reversé</span><b>{cdf(l.verse, '0 CDF')}</b></div>
            <div className="kpi"><span className="doux">Reste à reverser</span><b style={l.reste > 0 ? { color: 'var(--attention)' } : undefined}>{cdf(l.reste, '0 CDF')}</b></div>
          </div>
          {l.organisateur?.reversementOperateur ? <p className="doux">Reversement sur {infoOperateur(l.organisateur.reversementOperateur).nom}{l.organisateur.reversementNumeroFin ? `, numéro se terminant par ${l.organisateur.reversementNumeroFin}` : ''}. Numéro complet : <Link href={`/admin/organisateurs/${l.organisateur.id}`}>fiche organisateur</Link>.</p> : <p className="note note-attention">Numéro de reversement non renseigné.</p>}
          {edition && l.reste > 0 ? (
            <FormAuto action={enregistrerReversement.bind(null, l.id)} auto={false} libelle="Enregistrer le reversement">
              <div className="grid gap-4 sm:grid-cols-4">
                <Champ nom="montant" id={`montant-${l.id}`} label="Montant (CDF)"><input id={`montant-${l.id}`} name="montant" type="number" min={1} className="champ-texte" defaultValue={l.reste} /></Champ>
                <Champ nom="operateur" id={`op-${l.id}`} label="Opérateur"><select id={`op-${l.id}`} name="operateur" className="champ-select" defaultValue={l.organisateur?.reversementOperateur ?? ''}><option value="">Autre</option>{OPERATEURS.map((o) => <option key={o.k} value={o.k}>{o.nom}</option>)}</select></Champ>
                <Champ nom="reference" id={`ref-${l.id}`} label="Référence de transaction"><input id={`ref-${l.id}`} name="reference" className="champ-texte" /></Champ>
                <Champ nom="date" id={`date-${l.id}`} label="Date"><input id={`date-${l.id}`} name="date" type="date" className="champ-texte" /></Champ>
              </div>
              <Champ nom="note" id={`note-${l.id}`} label="Note (facultatif)"><input id={`note-${l.id}`} name="note" className="champ-texte" maxLength={300} /></Champ>
            </FormAuto>
          ) : null}
        </section>
      ))}
      <h2 className="titre-section">Historique</h2>
      {historique.length === 0 ? <p className="doux">Aucun reversement enregistré.</p> : (
        <div className="tableau-cadre"><table className="tableau">
          <thead><tr><th>Date</th><th>Organisateur</th><th>Événement</th><th>Montant</th><th>Référence</th></tr></thead>
          <tbody>{historique.map((h) => <tr key={h.id}><td>{dateLongue(h.effectueLe).split(' à ')[0]}</td><td>{h.organisateur.nom}</td><td>{h.evenement.titre}</td><td>{cdf(h.montantCdf)}</td><td>{h.referenceTransaction}</td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}
