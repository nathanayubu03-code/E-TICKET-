'use client';

import { useActionState } from 'react';
import { rejoindreListeAttente, type EtatFormulaire } from '@/app/(public)/actions';
import { ChampPiege } from '@/components/ui/ChampPiege';
import { ChampTelephone } from '@/components/ui/ChampTelephone';
import { ecart } from '@/lib/style';

export function FormListeAttente({ evenementId, textes }: { evenementId: string; textes: { titre: string; texte: string; numero: string; placeholder: string; consentement: string; envoyer: string; statut: string } }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(rejoindreListeAttente, { ok: false });
  return (
    <aside className="panneau pile panier" style={ecart(14)} aria-labelledby="t-attente">
      <span className="badge badge-neutre" style={{ alignSelf: 'flex-start' }}>{textes.statut}</span>
      <h2 id="t-attente" className="titre-section">{textes.titre}</h2>
      {etat.ok ? <p className="note note-succes" role="status">{etat.message}</p> : (
        <form action={action} className="pile" style={ecart(14)} noValidate>
          <p className="doux">{textes.texte}</p>
          <ChampPiege />
          <input type="hidden" name="evenementId" value={evenementId} />
          <ChampTelephone id="attente-tel" label={textes.numero} placeholder={textes.placeholder} erreur={etat.erreurs?.telephone} />
          <label className="case"><input type="checkbox" name="consentement" value="oui" /><span>{textes.consentement}</span></label>
          {etat.erreurs?.consentement ? <span className="erreur-champ">{etat.erreurs.consentement}</span> : null}
          {etat.message ? <p className="note note-danger" role="alert">{etat.message}</p> : null}
          <button className="btn btn-principal btn-grand btn-plein" type="submit" disabled={enCours}>{textes.envoyer}</button>
        </form>
      )}
    </aside>
  );
}
