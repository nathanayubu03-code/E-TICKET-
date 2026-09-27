'use client';

import { useActionState } from 'react';
import { sAbonnerAlertes, type EtatFormulaire } from '@/app/(public)/actions';
import { ChampPiege } from '@/components/ui/ChampPiege';
import { ChampTelephone } from '@/components/ui/ChampTelephone';
import { ecart } from '@/lib/style';

export interface TextesAlerte { titre: string; texte: string; numero: string; placeholder: string; ville: string; toutesVilles: string; consentement: string; envoyer: string }

export function FormAlerteSms({ textes, villes, id = 'alerte' }: { textes: TextesAlerte; villes: { nom: string; slug: string }[]; id?: string }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(sAbonnerAlertes, { ok: false });
  if (etat.ok) return <p className="note note-succes" role="status">{etat.message}</p>;
  return (
    <form action={action} className="pile" style={ecart(14)} noValidate>
      <ChampPiege />
      <ChampTelephone id={`${id}-tel`} label={textes.numero} placeholder={textes.placeholder} erreur={etat.erreurs?.telephone} />
      {villes.length > 0 ? (
        <div className="champ">
          <label htmlFor={`${id}-ville`}>{textes.ville}</label>
          <select id={`${id}-ville`} name="ville" className="champ-select" defaultValue="">
            <option value="">{textes.toutesVilles}</option>
            {villes.map((v) => <option key={v.slug} value={v.slug}>{v.nom}</option>)}
          </select>
        </div>
      ) : null}
      <label className="case">
        <input type="checkbox" name="consentement" value="oui" aria-invalid={etat.erreurs?.consentement ? true : undefined} />
        <span>{textes.consentement}</span>
      </label>
      {etat.erreurs?.consentement ? <span className="erreur-champ">{etat.erreurs.consentement}</span> : null}
      {etat.message ? <p className="note note-danger" role="alert">{etat.message}</p> : null}
      <button className="btn btn-principal btn-grand" type="submit" disabled={enCours}>{textes.envoyer}</button>
    </form>
  );
}
