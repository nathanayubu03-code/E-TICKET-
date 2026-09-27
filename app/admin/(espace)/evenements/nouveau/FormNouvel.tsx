'use client';

import { useActionState } from 'react';
import { creerEvenement, type EtatAction } from '../actions';

export function FormNouvel({ categories }: { categories: { id: string; nom: string }[] }) {
  const [etat, action, enCours] = useActionState<EtatAction, FormData>(creerEvenement, { ok: true });
  return (
    <form action={action} className="pile" style={{ ['--gap' as string]: '16px' }}>
      <div className="champ">
        <label htmlFor="titre">Titre</label>
        <input id="titre" name="titre" className="champ-texte" required maxLength={140} autoFocus />
        {etat.erreurs?.titre ? <span className="erreur-champ">{etat.erreurs.titre}</span> : null}
      </div>
      <div className="champ">
        <label htmlFor="categorieId">Catégorie</label>
        <select id="categorieId" name="categorieId" className="champ-select" required defaultValue="">
          <option value="" disabled>Choisir</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        {etat.erreurs?.categorieId ? <span className="erreur-champ">{etat.erreurs.categorieId}</span> : null}
      </div>
      <button className="btn btn-principal btn-grand" type="submit" disabled={enCours}>Créer le brouillon</button>
    </form>
  );
}
