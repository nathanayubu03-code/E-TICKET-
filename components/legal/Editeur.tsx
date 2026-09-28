import { env } from '@/lib/env';

/** Identité de l'éditeur, depuis les variables d'environnement. Rien n'est affiché tant qu'elles sont vides. */
export function Editeur() {
  const e = env();
  if (!e.EDITEUR_NOM) return null;
  return (
    <section className="pile" style={{ ['--gap' as string]: '6px' }} aria-labelledby="t-editeur">
      <h2 id="t-editeur" className="titre-section">Qui sommes-nous</h2>
      <p>
        {e.EDITEUR_NOM}{e.EDITEUR_FORME ? `, ${e.EDITEUR_FORME}` : ''}{e.EDITEUR_RCCM ? `, RCCM ${e.EDITEUR_RCCM}` : ''}.
        {e.EDITEUR_ADRESSE ? <><br />{e.EDITEUR_ADRESSE}</> : null}
        {e.CONTACT_EMAIL ? <><br />Contact : <a href={`mailto:${e.CONTACT_EMAIL}`}>{e.CONTACT_EMAIL}</a></> : null}
      </p>
    </section>
  );
}

export function Contact({ objet }: { objet: string }) {
  const e = env();
  return e.CONTACT_EMAIL ? <a href={`mailto:${e.CONTACT_EMAIL}?subject=${encodeURIComponent(objet)}`}>{e.CONTACT_EMAIL}</a> : <span>la page Aide</span>;
}
