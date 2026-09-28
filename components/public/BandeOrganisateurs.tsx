import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { env } from '@/lib/env';
import { ecart } from '@/lib/style';

export async function BandeOrganisateurs() {
  const t = await getTranslations('accueil');
  const e = env();
  const contact = Boolean(e.CONTACT_ORGANISATEURS_EMAIL || e.CONTACT_ORGANISATEURS_TELEPHONE);
  return (
    <section id="organisateurs" aria-labelledby="titre-orga">
      <div className="panneau bande-orga">
        <div className="pile" style={ecart(10)}>
          <h2 id="titre-orga" className="affiche" style={{ fontSize: 'var(--t-titre-section)', color: '#FFD21F' }}>{t('orgaTitre')}</h2>
          <p className="doux" style={{ fontSize: 'var(--t-texte)' }}>{t('orgaTexte')}</p>
        </div>
        {contact ? <Link className="btn btn-principal btn-grand" href="/organisateurs">{t('orgaBouton')}</Link> : null}
      </div>
    </section>
  );
}
