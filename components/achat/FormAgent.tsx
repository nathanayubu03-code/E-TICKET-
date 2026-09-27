'use client';

import { useActionState } from 'react';
import { declarerAgent } from '@/app/(public)/achat/actions';
import { ChampTelephone } from '@/components/ui/ChampTelephone';
import type { InfoOperateur } from '@/lib/operateurs';
import { ecart } from '@/lib/style';

type Etat = { ok: boolean; message?: string; erreurs?: Record<string, string> };

export function FormAgent({ code, operateurs, chiffres, textes }: { code: string; operateurs: InfoOperateur[]; chiffres: string; textes: Record<'operateur' | 'reference' | 'referenceAide' | 'numeroPayeur' | 'envoyer' | 'placeholder', string> }) {
  const [etat, action, enCours] = useActionState<Etat, FormData>(declarerAgent.bind(null, code), { ok: false });
  if (etat.ok) return <p className="note note-succes" role="status">{etat.message}</p>;
  return (
    <form action={action} className="pile" style={ecart(14)} noValidate>
      <div className="champ">
        <label htmlFor="agent-op">{textes.operateur}</label>
        <select id="agent-op" name="operateur" className="champ-select" defaultValue={operateurs[0]?.k}>
          {operateurs.map((o) => <option key={o.k} value={o.k}>{o.nom}</option>)}
        </select>
      </div>
      <div className="champ">
        <label htmlFor="agent-ref">{textes.reference}</label>
        <input id="agent-ref" name="reference" className="champ-texte" autoComplete="off" autoCapitalize="characters" maxLength={40} aria-invalid={etat.erreurs?.reference ? true : undefined} />
        {etat.erreurs?.reference ? <span className="erreur-champ">{etat.erreurs.reference}</span> : <span className="aide-champ">{textes.referenceAide}</span>}
      </div>
      <ChampTelephone id="agent-tel" label={textes.numeroPayeur} placeholder={textes.placeholder} defaut={chiffres} erreur={etat.erreurs?.telephone} drapeau={false} />
      {etat.message ? <p className="note note-danger" role="alert">{etat.message}</p> : null}
      <button className="btn btn-principal btn-grand" type="submit" disabled={enCours}>{textes.envoyer}</button>
    </form>
  );
}
