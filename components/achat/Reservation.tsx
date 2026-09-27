'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { reserver } from '@/app/(public)/achat/actions';
import { ecart } from '@/lib/style';
import { ConnexionOtp, type TextesConnexion } from './ConnexionOtp';

/** Étape 1 : connexion si besoin, puis réservation des places et passage au paiement. */
export function Reservation({ connecte, slug, lignes, textes, textesConnexion }: {
  connecte: boolean; slug: string; lignes: string;
  textes: { titre: string; texte: string; continuer: string; codePromo: string; retour: string };
  textesConnexion: TextesConnexion;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [promo, setPromo] = useState('');
  const [enCours, demarrer] = useTransition();
  const lancer = () => demarrer(async () => {
    setErreur(null);
    const r = await reserver(slug, lignes, promo || null);
    if (r.ok) router.replace(`/achat/${r.code}`);
    else setErreur(r.message);
  });
  return (
    <section className="panneau pile" style={ecart(18)} aria-labelledby="t-tel">
      <h1 id="t-tel" className="affiche" style={{ fontSize: 'clamp(36px,6vw,52px)' }}>{textes.titre}</h1>
      {connecte ? (
        <>
          <div className="champ">
            <label htmlFor="promo">{textes.codePromo}</label>
            <input id="promo" className="champ-texte" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} maxLength={40} autoComplete="off" />
          </div>
          <button className="btn btn-principal btn-grand" type="button" disabled={enCours} onClick={lancer}>{textes.continuer}</button>
        </>
      ) : (
        <>
          <p className="doux" style={{ fontSize: 17 }}>{textes.texte}</p>
          <ConnexionOtp textes={textesConnexion} onConnecte={lancer} />
        </>
      )}
      {erreur ? (
        <div className="pile" style={ecart(8)}>
          <p className="note note-danger" role="alert">{erreur}</p>
          <a className="lien-bouton" href={`/evenements/${slug}`}>{textes.retour}</a>
        </div>
      ) : null}
    </section>
  );
}
