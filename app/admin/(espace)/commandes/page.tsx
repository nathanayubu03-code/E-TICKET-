import { BoutonAction } from '@/components/admin/BoutonAction';
import { LIBELLES_COMMANDE } from '@/lib/admin/libelles';
import { cdf } from '@/lib/argent';
import { aUnRole, ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db, type Prisma, type StatutCommande } from '@/lib/db';
import { dateLongue } from '@/lib/fuseaux';
import { formaterTelephone, normaliserTelephone } from '@/lib/telephone';
import { annuler, rembourser, renvoyer } from './actions';

export const metadata = { title: 'Commandes et billets' };

export default async function Commandes({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string }> }) {
  const s = await exigerRole(['SUPERADMIN', 'ADMIN', 'AGENT']);
  const edition = aUnRole(s.user.roles, ROLES_EDITION);
  const { q: brut = '', statut } = await searchParams;
  const q = brut.trim().toUpperCase();
  const tel = normaliserTelephone(brut);
  let where: Prisma.OrderWhereInput | null = null;
  if (tel) where = { telephone: tel };
  else if (/^ET-[A-Z0-9]{6}$/.test(q)) where = { code: q };
  else if (/^ET-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(q)) where = { billets: { some: { publicId: q } } };
  else if (/^[A-Z2-7]{26}$/.test(q)) where = { billets: { some: { code: q } } };
  if (statut && statut in LIBELLES_COMMANDE) where = { ...(where ?? {}), statut: statut as StatutCommande };
  const [sansPlace, commandes] = await Promise.all([
    db.order.findMany({ where: { statut: 'PAYEE_SANS_PLACE' }, orderBy: { payeeLe: 'asc' }, include: { evenement: { select: { titre: true } } } }),
    where ? db.order.findMany({ where, orderBy: { creeLe: 'desc' }, take: 50, include: { evenement: { select: { titre: true, fuseau: true } }, lignes: { include: { typeBillet: { select: { nom: true } } } }, billets: { select: { publicId: true, statut: true } }, paiements: { orderBy: { creeLe: 'desc' }, take: 1 } } }) : Promise.resolve([]),
  ]);
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Commandes et billets</h1>
      {sansPlace.length > 0 ? (
        <section className="note note-danger" style={{ display: 'block' }} aria-labelledby="t-prio">
          <h2 id="t-prio" style={{ fontSize: 'var(--t-chapo)', marginBottom: 6 }}>À rembourser en priorité : payées sans place</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>{sansPlace.map((c) => (
            <li key={c.id} className="rangee envelopper" style={{ gap: 10 }}>{c.code} · {c.evenement.titre} · {cdf(c.totalCdf)} · {formaterTelephone(c.telephone)}{edition ? <BoutonAction classe="lien-bouton" libelle="Marquer remboursée" confirmation="Le remboursement a-t-il bien été envoyé sur le compte Mobile Money de l'acheteur ?" action={rembourser.bind(null, c.id)} /> : null}</li>
          ))}</ul>
        </section>
      ) : null}
      <form className="rangee envelopper" style={{ maxWidth: 640 }}>
        <label className="sr" htmlFor="q">Recherche</label>
        <input id="q" name="q" className="champ-texte" style={{ flex: 1 }} placeholder="Téléphone, code de commande (ET-XXXXXX) ou de billet (ET-XXXX-XXXX)" defaultValue={brut} />
        <button className="btn btn-principal" type="submit">Chercher</button>
      </form>
      {!where ? <p className="doux">Entrez un numéro de téléphone, un code de commande ou un code de billet.</p> : commandes.length === 0 ? <div className="admin-panneau"><p>Aucune commande trouvée.</p></div> : commandes.map((c) => (
        <section key={c.id} className="admin-panneau pile" style={{ ['--gap' as string]: '10px' }} aria-label={c.code}>
          <div className="rangee entre envelopper">
            <div><b style={{ fontSize: 'var(--t-titre-carte)' }}>{c.code}</b> · {c.evenement.titre}<div className="doux">{formaterTelephone(c.telephone)} · créée le {dateLongue(c.creeLe, c.evenement.fuseau ?? undefined)}</div></div>
            <span className="badge badge-neutre">{LIBELLES_COMMANDE[c.statut]}</span>
          </div>
          <div className="lignes">
            {c.lignes.map((l) => <div key={l.id}><span>{l.quantite} × {l.typeBillet.nom}</span><span>{cdf(l.quantite * l.prixUnitaireCdf)}</span></div>)}
            <div style={{ fontWeight: 700 }}><span>Total</span><span>{cdf(c.totalCdf)}</span></div>
          </div>
          {c.billets.length ? <p className="doux">Billets : {c.billets.map((b) => `${b.publicId} (${b.statut.toLowerCase()})`).join(', ')}</p> : null}
          {c.paiements[0] ? <p className="doux">Dernier paiement : {c.paiements[0].statut} · {c.paiements[0].referenceOperateur ?? 'sans référence'}</p> : null}
          {c.noteRemboursement ? <p className="doux">Remboursement : {c.noteRemboursement}</p> : null}
          <div className="rangee envelopper">
            {c.statut === 'PAYEE' ? <BoutonAction libelle="Renvoyer le SMS" action={renvoyer.bind(null, c.id)} /> : null}
            {edition && (c.statut === 'EN_ATTENTE' || c.statut === 'PAYEE') ? <BoutonAction libelle="Annuler la commande" danger confirmation={c.statut === 'PAYEE' ? 'Annuler cette commande payée ? Les billets ne seront plus valables.' : 'Annuler cette commande ?'} action={annuler.bind(null, c.id)} /> : null}
            {edition && ['PAYEE', 'PAYEE_SANS_PLACE', 'ANNULEE'].includes(c.statut) && c.payeeLe ? <BoutonAction libelle="Marquer remboursée" confirmation="Le remboursement a-t-il bien été envoyé ?" action={rembourser.bind(null, c.id)} /> : null}
          </div>
        </section>
      ))}
    </div>
  );
}
