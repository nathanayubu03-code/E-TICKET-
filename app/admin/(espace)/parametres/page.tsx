import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { dateLongue, jourMois, utcVersLocal } from '@/lib/fuseaux';
import { OPERATEURS } from '@/lib/operateurs';
import { parametre } from '@/lib/parametres';
import { masquerTelephone } from '@/lib/telephone';
import { enregistrerParametres, saisirTaux } from './actions';

export const metadata = { title: 'Paramètres' };

export default async function Parametres() {
  const s = await exigerRole(['SUPERADMIN', 'ADMIN']);
  const superAdmin = s.user.roles.includes('SUPERADMIN');
  const [bps, limite, numeros, taux] = await Promise.all([parametre('commission_bps'), parametre('limite_billets'), parametre('numeros_marchands'), db.exchangeRate.findMany({ orderBy: { effectifLe: 'desc' }, take: 10 })]);
  const auteurs = new Map((await db.user.findMany({ where: { id: { in: taux.map((t) => t.saisiParId) } }, select: { id: true, nom: true, telephone: true } })).map((u) => [u.id, u.nom ?? masquerTelephone(u.telephone)]));
  const aujourdhui = utcVersLocal(new Date(), 'Africa/Kinshasa').jour;
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <h1 className="affiche" style={{ fontSize: 44 }}>Paramètres</h1>
      {!superAdmin ? <p className="note note-info">Lecture seule : seul le super-administrateur modifie les paramètres.</p> : null}
      <section className="admin-panneau pile" aria-labelledby="t-gen">
        <h2 id="t-gen" className="titre-section" style={{ fontSize: 26 }}>Général</h2>
        <fieldset disabled={!superAdmin} style={{ border: 'none', padding: 0, margin: 0 }}>
          <FormAuto action={enregistrerParametres} auto={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Champ nom="commission" label="Commission globale (%)" aide="Entre 0 et 30 %. Un organisateur peut avoir son propre taux."><input id="commission" name="commission" inputMode="decimal" className="champ-texte" defaultValue={bps / 100} /></Champ>
              <Champ nom="limite" label="Billets par personne et par événement" aide="Un événement peut avoir sa propre limite."><input id="limite" name="limite" type="number" min={1} max={20} className="champ-texte" defaultValue={limite} /></Champ>
            </div>
            <h3 style={{ fontSize: 18 }}>Numéros marchands (paiement chez un agent)</h3>
            <p className="doux">Vide : l&apos;opérateur n&apos;apparaît pas dans « Payer chez un agent ». Sans aucun numéro, l&apos;option est masquée.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {OPERATEURS.map((o) => <Champ key={o.k} nom={`numero_${o.k}`} label={o.nom}><input id={`numero_${o.k}`} name={`numero_${o.k}`} type="tel" className="champ-texte" defaultValue={numeros[o.k] ?? ''} /></Champ>)}
            </div>
          </FormAuto>
        </fieldset>
      </section>
      <section className="admin-panneau pile" aria-labelledby="t-taux">
        <h2 id="t-taux" className="titre-section" style={{ fontSize: 26 }}>Taux CDF / USD indicatif</h2>
        <p className="doux">Sert uniquement à afficher l&apos;équivalent en USD (« taux indicatif du JJ/MM »). Tous les paiements restent en CDF. Sans taux, l&apos;USD n&apos;est pas affiché.</p>
        {superAdmin ? (
          <FormAuto action={saisirTaux} auto={false} libelle="Enregistrer le taux">
            <div className="grid gap-4 sm:grid-cols-2">
              <Champ nom="taux" label="CDF pour 1 USD"><input id="taux" name="taux" type="number" min={100} className="champ-texte" /></Champ>
              <Champ nom="date" label="Applicable à partir du"><input id="date" name="date" type="date" className="champ-texte" defaultValue={aujourdhui} /></Champ>
            </div>
          </FormAuto>
        ) : null}
        {taux.length === 0 ? <p>Aucun taux saisi.</p> : (
          <div className="tableau-cadre"><table className="tableau">
            <thead><tr><th>Taux</th><th>Affiché comme</th><th>Saisi le</th><th>Par</th></tr></thead>
            <tbody>{taux.map((t) => <tr key={t.id}><td>1 USD = {t.cdfParUsd} CDF</td><td>taux indicatif du {jourMois(t.effectifLe)}</td><td>{dateLongue(t.creeLe)}</td><td>{auteurs.get(t.saisiParId) ?? '·'}</td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
