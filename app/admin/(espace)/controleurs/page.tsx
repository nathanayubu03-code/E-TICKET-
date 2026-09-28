import { BoutonAction } from '@/components/admin/BoutonAction';
import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { Rafraichir } from '@/components/admin/Rafraichir';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ilYA } from '@/lib/temps';
import { dateCourte, heure } from '@/lib/fuseaux';
import { masquerTelephone } from '@/lib/telephone';
import { creerControleur, retirerControleur } from './actions';

export const metadata = { title: 'Contrôleurs' };
export const dynamic = 'force-dynamic';

export default async function Controleurs() {
  await exigerRole(ROLES_EDITION);
  const evts = await db.event.findMany({
    where: { statut: { in: ['PUBLIE', 'COMPLET'] }, debutLe: { gte: ilYA(2 * 86400_000) } },
    orderBy: { debutLe: 'asc' },
    include: { ville: true, controleurs: { include: { user: { select: { id: true, nom: true, telephone: true } } } }, _count: { select: { billets: true } } },
  });
  const stats = await Promise.all(evts.map(async (e) => ({
    entrees: await db.ticket.count({ where: { evenementId: e.id, statut: 'UTILISE' } }),
    conflits: await db.scan.findMany({ where: { evenementId: e.id, conflit: true }, orderBy: { scanneLe: 'desc' }, take: 20, include: { billet: { select: { publicId: true } } } }),
    derniers: await db.scan.findMany({ where: { evenementId: e.id }, orderBy: { recuLe: 'desc' }, take: 8, include: { billet: { select: { publicId: true } } } }),
    appareils: await db.scannerDevice.findMany({ where: { evenementId: e.id }, include: { user: { select: { nom: true } } } }),
  })));
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <Rafraichir secondes={10} />
      <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Contrôleurs</h1>
      <section className="admin-panneau pile" aria-labelledby="t-aff">
        <h2 id="t-aff" className="titre-section">Affecter un contrôleur</h2>
        {evts.length === 0 ? <p>Aucun événement publié à venir.</p> : (
          <FormAuto action={creerControleur} auto={false} libelle="Affecter">
            <div className="grid gap-4 sm:grid-cols-2">
              <Champ nom="nom" label="Nom"><input id="nom" name="nom" className="champ-texte" maxLength={80} /></Champ>
              <Champ nom="telephone" label="Numéro"><input id="telephone" name="telephone" type="tel" className="champ-texte" autoComplete="off" /></Champ>
              <Champ nom="motDePasse" label="Mot de passe" aide="Obligatoire pour un nouveau compte. Vide : inchangé."><input id="motDePasse" name="motDePasse" type="password" className="champ-texte" autoComplete="new-password" /></Champ>
              <Champ nom="evenementId" label="Événement">
                <select id="evenementId" name="evenementId" className="champ-select">{evts.map((e) => <option key={e.id} value={e.id}>{e.titre}</option>)}</select>
              </Champ>
              <Champ nom="porte" label="Porte (facultatif)"><input id="porte" name="porte" className="champ-texte" maxLength={40} /></Champ>
            </div>
          </FormAuto>
        )}
      </section>
      {evts.map((e, i) => {
        const st = stats[i]!;
        const fuseau = e.ville?.fuseau ?? undefined;
        return (
          <section key={e.id} className="admin-panneau pile" aria-label={e.titre}>
            <div className="rangee entre envelopper">
              <h2 className="titre-section">{e.titre}</h2>
              <span className="doux">{e.debutLe ? dateCourte(e.debutLe, fuseau) : ''}</span>
            </div>
            <div className="kpis">
              <div className="kpi"><span className="doux">Entrées</span><b>{st.entrees} / {e._count.billets}</b></div>
              <div className="kpi"><span className="doux">Appareils</span><b>{st.appareils.length}</b></div>
              <div className="kpi"><span className="doux">Doublons hors ligne</span><b style={st.conflits.length ? { color: 'var(--danger)' } : undefined}>{st.conflits.length}</b></div>
            </div>
            {e.controleurs.length === 0 ? <p className="doux">Aucun contrôleur affecté.</p> : (
              <ul style={{ margin: 0, paddingLeft: 20 }}>{e.controleurs.map((c) => (
                <li key={c.userId} className="rangee envelopper" style={{ gap: 10 }}>
                  <span>{c.user.nom ?? masquerTelephone(c.user.telephone)}{c.porte ? ` · Porte ${c.porte}` : ''}</span>
                  <BoutonAction classe="lien-bouton" libelle="Retirer" action={retirerControleur.bind(null, c.userId, e.id)} />
                </li>
              ))}</ul>
            )}
            {st.conflits.length > 0 ? (
              <div className="note note-danger" style={{ display: 'block' }}>
                <b>Billets scannés deux fois sans réseau :</b>
                <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>{st.conflits.map((c) => <li key={c.id}>{c.billet?.publicId ?? 'inconnu'} · second scan à {heure(c.scanneLe, fuseau)}{c.porte ? `, porte ${c.porte}` : ''}</li>)}</ul>
              </div>
            ) : null}
            {st.derniers.length > 0 ? (
              <div className="tableau-cadre"><table className="tableau">
                <thead><tr><th>Heure</th><th>Billet</th><th>Résultat</th><th>Porte</th><th>Mode</th></tr></thead>
                <tbody>{st.derniers.map((d) => <tr key={d.id}><td>{heure(d.scanneLe, fuseau)}</td><td>{d.billet?.publicId ?? '·'}</td><td>{d.resultat}</td><td>{d.porte ?? '·'}</td><td>{d.horsLigne ? 'Hors ligne' : 'En ligne'}</td></tr>)}</tbody>
              </table></div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
