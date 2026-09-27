import Link from 'next/link';
import { parCategorie, parOperateur, totaux } from '@/lib/admin/stats';
import { cdf, formaterNombre } from '@/lib/argent';
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
  const kpi = (libelle: string, valeur: string, aide?: string) => <div className="kpi"><span className="doux">{libelle}</span><b>{valeur}</b>{aide ? <span className="doux" style={{ fontSize: 14 }}>{aide}</span> : null}</div>;
  return (
    <div className="pile" style={{ ['--gap' as string]: '20px' }}>
      <h1 className="affiche" style={{ fontSize: 44 }}>Tableau de bord</h1>
      {sansPlace > 0 ? <Link className="note note-danger" href="/admin/commandes?statut=PAYEE_SANS_PLACE">{sansPlace} commande{sansPlace > 1 ? 's' : ''} payée{sansPlace > 1 ? 's' : ''} sans place : à rembourser en priorité.</Link> : null}
      {tout.commandes === 0 ? <div className="admin-panneau"><p><b>Aucune vente pour le moment.</b></p></div> : null}
      <section className="pile" aria-labelledby="t-jour" style={{ ['--gap' as string]: '10px' }}>
        <h2 id="t-jour" className="titre-section" style={{ fontSize: 26 }}>Aujourd&apos;hui</h2>
        <div className="kpis">{kpi('Billets vendus', formaterNombre(jour.billets))}{kpi('Revenus bruts', cdf(jour.brut, '0 CDF'))}{kpi('Commission', cdf(jour.commission, '0 CDF'))}{kpi('Net organisateurs', cdf(jour.net, '0 CDF'))}</div>
      </section>
      <section className="pile" aria-labelledby="t-mois" style={{ ['--gap' as string]: '10px' }}>
        <h2 id="t-mois" className="titre-section" style={{ fontSize: 26 }}>Ce mois-ci</h2>
        <div className="kpis">{kpi('Billets vendus', formaterNombre(mois.billets))}{kpi('Revenus bruts', cdf(mois.brut, '0 CDF'))}{kpi('Commission', cdf(mois.commission, '0 CDF'))}{kpi('Net organisateurs', cdf(mois.net, '0 CDF'))}</div>
      </section>
      <section className="pile" aria-labelledby="t-attente" style={{ ['--gap' as string]: '10px' }}>
        <h2 id="t-attente" className="titre-section" style={{ fontSize: 26 }}>À surveiller</h2>
        <div className="kpis">
          {kpi('Paiements en attente', formaterNombre(enAttente), 'Vérifiés automatiquement pendant 15 minutes')}
          {!organisateur ? <Link href="/admin/paiements/manuels" className="kpi-lien">{kpi('Paiements manuels à valider', formaterNombre(manuels))}</Link> : null}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-panneau pile" aria-labelledby="t-op">
          <h2 id="t-op" className="titre-section" style={{ fontSize: 26 }}>Par opérateur</h2>
          {operateurs.length ? <Barres lignes={operateurs.map((o) => ({ nom: o.nom, valeur: o.montant, texte: cdf(o.montant), couleur: o.fond }))} /> : <p className="doux">Aucune vente pour le moment.</p>}
        </section>
        <section className="admin-panneau pile" aria-labelledby="t-cat">
          <h2 id="t-cat" className="titre-section" style={{ fontSize: 26 }}>Par catégorie de billet</h2>
          {categories.length ? <Barres lignes={categories.slice(0, 12).map((c) => ({ nom: c.nom, valeur: c.billets, texte: `${formaterNombre(c.billets)} · ${cdf(c.montant)}` }))} /> : <p className="doux">Aucune vente pour le moment.</p>}
        </section>
      </div>
    </div>
  );
}
