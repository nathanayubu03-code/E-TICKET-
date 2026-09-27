'use client';

import { useActionState } from 'react';
import { ChampTelephone } from '@/components/ui/ChampTelephone';
import { ecart } from '@/lib/style';
import { validerCodeAdmin, validerIdentifiants, type EtatConnexion } from './actions';

export function FormConnexionAdmin({ suite }: { suite: string }) {
  const [etat1, action1, enCours1] = useActionState<EtatConnexion, FormData>(validerIdentifiants, { etape: 'identifiants' });
  const [etat2, action2, enCours2] = useActionState<EtatConnexion, FormData>(validerCodeAdmin, { etape: 'code' });
  const etapeCode = etat1.etape === 'code' && etat2.etape === 'code';
  const message = etapeCode ? etat2.message : etat2.etape === 'identifiants' && etat2.message ? etat2.message : etat1.message;
  return etapeCode ? (
    <form action={action2} className="pile" style={ecart(16)}>
      <input type="hidden" name="suite" value={suite} />
      <p>Un code à 6 chiffres vient d&apos;être envoyé par SMS au numéro du compte.</p>
      <div className="champ">
        <label htmlFor="code">Code reçu par SMS</label>
        <input id="code" name="code" className="champ-texte" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus />
        {etat1.codeTest ? <p className="code-test" role="status">Code de test : <b>{etat1.codeTest}</b></p> : null}
      </div>
      {message ? <p className="note note-danger" role="alert">{message}</p> : null}
      <button className="btn btn-principal btn-grand" type="submit" disabled={enCours2}>Valider le code</button>
    </form>
  ) : (
    <form action={action1} className="pile" style={ecart(16)}>
      <ChampTelephone id="admin-tel" label="Numéro" placeholder="XX XXX XX XX" />
      <div className="champ">
        <label htmlFor="motDePasse">Mot de passe</label>
        <input id="motDePasse" name="motDePasse" type="password" className="champ-texte" autoComplete="current-password" required />
      </div>
      {message ? <p className="note note-danger" role="alert">{message}</p> : null}
      <button className="btn btn-principal btn-grand" type="submit" disabled={enCours1}>Continuer</button>
    </form>
  );
}
