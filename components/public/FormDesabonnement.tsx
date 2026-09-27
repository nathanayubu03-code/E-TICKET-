'use client';

import { useActionState } from 'react';
import { seDesabonnerAlertes, type EtatFormulaire } from '@/app/(public)/actions';
import { ChampPiege } from '@/components/ui/ChampPiege';
import { ChampTelephone } from '@/components/ui/ChampTelephone';
import { ecart } from '@/lib/style';

export function FormDesabonnement({ textes }: { textes: { numero: string; placeholder: string; envoyer: string } }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(seDesabonnerAlertes, { ok: false });
  if (etat.ok) return <p className="note note-succes" role="status">{etat.message}</p>;
  return (
    <form action={action} className="pile" style={ecart(14)} noValidate>
      <ChampPiege />
      <ChampTelephone id="desabo-tel" label={textes.numero} placeholder={textes.placeholder} erreur={etat.erreurs?.telephone} />
      {etat.message ? <p className="note note-danger" role="alert">{etat.message}</p> : null}
      <button className="btn btn-grand" type="submit" disabled={enCours}>{textes.envoyer}</button>
    </form>
  );
}
