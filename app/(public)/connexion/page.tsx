import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ConnexionPage } from '@/components/achat/ConnexionPage';
import { textesConnexion } from '@/components/achat/textes';
import { sessionCourante } from '@/lib/auth/session';
import { ecart } from '@/lib/style';

export const metadata: Metadata = { title: 'Connexion' };

export default async function Connexion({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite: brute } = await searchParams;
  // Redirection interne seulement.
  const suite = brute && brute.startsWith('/') && !brute.startsWith('//') ? brute : '/mes-billets';
  if (await sessionCourante()) redirect(suite);
  const t = await getTranslations('connexion');
  return (
    <main className="conteneur">
      <div className="achat pile" style={ecart(18)}>
        <section className="panneau pile" style={ecart(18)} aria-labelledby="t-cx">
          <h1 id="t-cx" className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>{t('titre')}</h1>
          <p className="doux" style={{ fontSize: 'var(--t-texte)' }}>{t('texte')}</p>
          <ConnexionPage textes={await textesConnexion()} suite={suite} />
        </section>
      </div>
    </main>
  );
}
