import Link from 'next/link';
import { parCategorie, parOperateur, totaux, type Totaux } from '@/lib/admin/stats';
import { DEVISES, formaterNombre, montant } from '@/lib/argent';
import { aUnRole, ROLES_ADMIN } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db, type Prisma } from '@/lib/db';
import { localVersUtc, utcVersLocal } from '@/lib/fuseaux';

export const metadata = { title: 'Tableau de bord' };
export const dynamic = 'force-dynamic';

function Barres({ lignes }: { lignes: { nom: string; valeur: number; texte: string; couleur?: string }[] }) {
  const max = Math.max(...lignes.map((l) => l.valeur), 1);
  return (
    <div className="pile" style={{ ['--gap' as string]: '10px' }}>
      {lignes.map((l) => (
        <div key={l.nom} className="pile" style={{ ['--gap' as string]: '4px' }}>
          <div className="rangee entre"><span>{l.nom}</span><b>{l.texte}</b></div>
          <div style={{ height: 10, borderRadius: 5, background: 'var(--surface-2)' }}><div style={{ height: '100%', width: `${(l.valeur / max) * 100}%`, borderRadius: 5, background: l.couleur ?? 'var(--encre)' }} /></div>
        </div>
      ))}
    </div>
  );
}

export default async function TableauDeBord() {
  const s = await exigerRole(ROLES_ADMIN);
  const organisateur = !aUnRole(s.user.roles, ['SUPERADMIN', 'ADMIN', 'AGENT']);
  const portee: Prisma.OrderWhereInput = organisateur ? { evenement: { organisateurId: s.user.organisateurId ?? '__aucun__' } } : {};
  const aujourdhui = utcVersLocal(new Date(), 'Africa/Kinshasa').jour;
  const debutJour = localVersUtc(aujourdhui, '00:00', 'Africa/Kinshasa');
  const debutMois = localVersUtc(`${aujourdhui.slice(0, 8)}01`, '00:00', 'Africa/Kinshasa');
  const [jour, mois, tout, operateurs, categories, enAttente, manuels, sansPlace] = await Promise.all([
    totaux({ ...portee, payeeLe: { gte: debutJour } }),
    totaux({ ...portee, payeeLe: { gte: debutMois } }),
    totaux(portee),
    parOperateur(portee),
    parCategorie(portee),
    db.payment.count({ where: { statut: { in: ['INITIE', 'EN_ATTENTE'] }, commande: portee } }),
    organisateur ? 0 : db.manualPaymentClaim.count({ where: { statut: 'EN_ATTENTE' } }),
    organisateur ? 0 : db.order.count({ where: { statut: 'PAYEE_SANS_PLACE' } }),
  ]);
  const kpi = (libelle: string, valeur: string, aide?: string) => <div className="kpi"><span className="doux">{libelle}</span><b>{valeur}</b>{aide ? <span className="doux" style={{ fontSize: 'var(--t-petit)' }}>{aide}</span> : null}</div>;
  // Une ligne d'indicateurs par devise : CDF et USD ne sont jamais additionnés. L'USD n'apparaît que s'il y a des ventes en USD.
  const blocTotaux = (x: Totaux) => (
    <>
      <div className="kpis">{kpi('Billets vendus', formaterNombre(x.billets))}{kpi('Commandes payées', formaterNombre(x.commandes))}</div>
      {DEVISES.filter((d) => d === 'CDF' || x.parDevise[d].brut > 0).map((d) => (
        <div key={d} className="kpis" data-devise={d}>{kpi(`Revenus bruts ${d}`, montant(x.parDevise[d].brut, d))}{kpi(`Commission ${d}`, montant(x.parDevise[d].commission, d))}{kpi(`Net organisateurs ${d}`, montant(x.parDevise[d].net, d))}</div>
      ))}
    </>
  );
  return (
    <div className="pile" style={{ ['--gap' as string]: '20px' }}>
      <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Tableau de bord</h1>
      {sansPlace > 0 ? <Link className="note note-danger" href="/admin/commandes?statut=PAYEE_SANS_PLACE">{sansPlace} commande{sansPlace > 1 ? 's' : ''} payée{sansPlace > 1 ? 's' : ''} sans place : à rembourser en priorité.</Link> : null}
      {tout.commandes === 0 ? <div className="admin-panneau"><p><b>Aucune vente pour le moment.</b></p></div> : null}
      <section className="pile" aria-labelledby="t-jour" style={{ ['--gap' as string]: '10px' }}>
        <h2 id="t-jour" className="titre-section">Aujourd&apos;hui</h2>
        {blocTotaux(jour)}
      </section>
      <section className="pile" aria-labelledby="t-mois" style={{ ['--gap' as string]: '10px' }}>
        <h2 id="t-mois" className="titre-section">Ce mois-ci</h2>
        {blocTotaux(mois)}
      </section>
      <section className="pile" aria-labelledby="t-attente" style={{ ['--gap' as string]: '10px' }}>
        <h2 id="t-attente" className="titre-section">À surveiller</h2>
        <div className="kpis">
          {kpi('Paiements en attente', formaterNombre(enAttente), 'Vérifiés automatiquement pendant 15 minutes')}
          {!organisateur ? <Link href="/admin/paiements/manuels" className="kpi-lien">{kpi('Paiements manuels à valider', formaterNombre(manuels))}</Link> : null}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-panneau pile" aria-labelledby="t-op">
          <h2 id="t-op" className="titre-section">Par opérateur</h2>
          {operateurs.length ? <Barres lignes={operateurs.map((o) => ({ nom: `${o.nom} · ${o.devise}`, valeur: o.montant, texte: montant(o.montant, o.devise), couleur: o.fond }))} /> : <p className="doux">Aucune vente pour le moment.</p>}
        </section>
        <section className="admin-panneau pile" aria-labelledby="t-cat">
          <h2 id="t-cat" className="titre-section">Par catégorie de billet</h2>
          {categories.length ? <Barres lignes={categories.slice(0, 12).map((c) => ({ nom: c.nom, valeur: c.billets, texte: [formaterNombre(c.billets), ...DEVISES.filter((d) => c.montants[d] > 0).map((d) => montant(c.montants[d], d))].join(' · ') }))} /> : <p className="doux">Aucune vente pour le moment.</p>}
        </section>
      </div>
    </div>
  );
}
