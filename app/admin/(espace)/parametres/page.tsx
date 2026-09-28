import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { exigerRole } from '@/lib/auth/session';
import { OPERATEURS } from '@/lib/operateurs';
import { parametre } from '@/lib/parametres';
import { enregistrerParametres } from './actions';

export const metadata = { title: 'Paramètres' };

export default async function Parametres() {
  const s = await exigerRole(['SUPERADMIN', 'ADMIN']);
  const superAdmin = s.user.roles.includes('SUPERADMIN');
  const [bps, limite, numeros, numerosUsd] = await Promise.all([parametre('commission_bps'), parametre('limite_billets'), parametre('numeros_marchands'), parametre('numeros_marchands_usd')]);
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Paramètres</h1>
      {!superAdmin ? <p className="note note-info">Lecture seule : seul le super-administrateur modifie les paramètres.</p> : null}
      <section className="admin-panneau pile" aria-labelledby="t-gen">
        <h2 id="t-gen" className="titre-section">Général</h2>
        <fieldset disabled={!superAdmin} style={{ border: 'none', padding: 0, margin: 0 }}>
          <FormAuto action={enregistrerParametres} auto={false}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Champ nom="commission" label="Commission globale (%)" aide="Entre 0 et 30 %. Un organisateur peut avoir son propre taux."><input id="commission" name="commission" inputMode="decimal" className="champ-texte" defaultValue={bps / 100} /></Champ>
              <Champ nom="limite" label="Billets par personne et par événement" aide="Un événement peut avoir sa propre limite."><input id="limite" name="limite" type="number" min={1} max={20} className="champ-texte" defaultValue={limite} /></Champ>
            </div>
            <h3 style={{ fontSize: 'var(--t-chapo)' }}>Numéros marchands (paiement chez un agent)</h3>
            <p className="doux">Le numéro peut différer selon la devise. Vide : l&apos;opérateur n&apos;apparaît pas dans « Payer chez un agent » pour cette devise. Sans aucun numéro, l&apos;option est masquée.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {OPERATEURS.map((o) => (
                <div key={o.k} className="pile" style={{ gap: 8 }}>
                  <Champ nom={`numero_${o.k}`} label={`${o.nom} · CDF`}><input id={`numero_${o.k}`} name={`numero_${o.k}`} type="tel" className="champ-texte" defaultValue={numeros[o.k] ?? ''} /></Champ>
                  <Champ nom={`numero_usd_${o.k}`} label={`${o.nom} · USD`}><input id={`numero_usd_${o.k}`} name={`numero_usd_${o.k}`} type="tel" className="champ-texte" defaultValue={numerosUsd[o.k] ?? ''} /></Champ>
                </div>
              ))}
            </div>
            <p className="doux" style={{ fontSize: 'var(--t-petit)' }}>Devises acceptées par opérateur : CDF et USD partout, à confirmer avec l&apos;agrégateur (réglage dans <code>lib/operateurs.ts</code>).</p>
          </FormAuto>
        </fieldset>
      </section>
    </div>
  );
}
