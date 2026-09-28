import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { env } from '@/lib/env';
import { formaterTelephone, normaliserTelephone } from '@/lib/telephone';
import { ecart } from '@/lib/style';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('pages'))('organisateurs') };
}

export default async function PageOrganisateurs() {
  const t = await getTranslations('accueil');
  const e = env();
  const tel = e.CONTACT_ORGANISATEURS_TELEPHONE ? normaliserTelephone(e.CONTACT_ORGANISATEURS_TELEPHONE) : null;
  return (
    <main className="conteneur">
      <section className="panneau bande-orga" aria-labelledby="titre-orga">
        <div className="pile" style={ecart(14)}>
          <h1 id="titre-orga" className="affiche" style={{ fontSize: 'var(--t-titre-page)', color: '#FFD21F' }}>{t('orgaTitre')}</h1>
          <p className="doux" style={{ fontSize: 'var(--t-chapo)' }}>{t('orgaTexte')}</p>
          {e.CONTACT_ORGANISATEURS_EMAIL || tel ? (
            <div className="rangee envelopper" style={ecart(10)}>
              {e.CONTACT_ORGANISATEURS_EMAIL ? <a className="btn btn-principal btn-grand" href={`mailto:${e.CONTACT_ORGANISATEURS_EMAIL}`}>{e.CONTACT_ORGANISATEURS_EMAIL}</a> : null}
              {tel ? <a className="btn btn-grand" href={`tel:${tel}`}>{formaterTelephone(tel)}</a> : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
