import { BoutonAction } from '@/components/admin/BoutonAction';
import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { cdf } from '@/lib/argent';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { basculerPromo, creerPromo } from './actions';

export const metadata = { title: 'Codes promo' };

export default async function Promos() {
  await exigerRole(ROLES_EDITION);
  const [promos, evts] = await Promise.all([
    db.promoCode.findMany({ orderBy: { creeLe: 'desc' }, include: { evenement: { select: { titre: true } } } }),
    db.event.findMany({ where: { statut: { in: ['BROUILLON', 'PUBLIE', 'COMPLET'] } }, orderBy: { debutLe: 'asc' }, select: { id: true, titre: true } }),
  ]);
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Codes promo</h1>
      <section className="admin-panneau pile" aria-labelledby="t-np">
        <h2 id="t-np" className="titre-section">Nouveau code</h2>
        <FormAuto action={creerPromo} auto={false} libelle="Créer le code">
          <div className="grid gap-4 sm:grid-cols-3">
            <Champ nom="code" label="Code"><input id="code" name="code" className="champ-texte" autoCapitalize="characters" maxLength={30} /></Champ>
            <Champ nom="type" label="Type"><select id="type" name="type" className="champ-select"><option value="POURCENTAGE">Pourcentage</option><option value="MONTANT">Montant fixe (CDF)</option></select></Champ>
            <Champ nom="valeur" label="Valeur (% ou CDF)"><input id="valeur" name="valeur" inputMode="decimal" className="champ-texte" /></Champ>
            <Champ nom="evenementId" label="Événement"><select id="evenementId" name="evenementId" className="champ-select"><option value="">Tous les événements</option>{evts.map((e) => <option key={e.id} value={e.id}>{e.titre}</option>)}</select></Champ>
            <Champ nom="quota" label="Quota (facultatif)"><input id="quota" name="quota" type="number" min={1} className="champ-texte" /></Champ>
            <Champ nom="limiteParTelephone" label="Limite par numéro"><input id="limiteParTelephone" name="limiteParTelephone" type="number" min={1} max={20} defaultValue={1} className="champ-texte" /></Champ>
            <Champ nom="debut" label="Début (facultatif)"><input id="debut" name="debut" type="date" className="champ-texte" /></Champ>
            <Champ nom="fin" label="Fin (facultatif)"><input id="fin" name="fin" type="date" className="champ-texte" /></Champ>
          </div>
        </FormAuto>
      </section>
      {promos.length === 0 ? <div className="admin-panneau"><p>Aucun code promo.</p></div> : (
        <div className="tableau-cadre"><table className="tableau">
          <thead><tr><th>Code</th><th>Remise</th><th>Portée</th><th>Utilisations</th><th>État</th><th></th></tr></thead>
          <tbody>{promos.map((p) => (
            <tr key={p.id}><td><b>{p.code}</b></td><td>{p.type === 'POURCENTAGE' ? `${p.valeur / 100} %` : cdf(p.valeur)}</td><td>{p.evenement?.titre ?? 'Tous'}</td><td>{p.utilise}{p.quota ? ` / ${p.quota}` : ''}</td><td>{p.actif ? 'Actif' : 'Désactivé'}</td>
              <td><BoutonAction classe="lien-bouton" libelle={p.actif ? 'Désactiver' : 'Activer'} action={basculerPromo.bind(null, p.id, !p.actif)} /></td></tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
