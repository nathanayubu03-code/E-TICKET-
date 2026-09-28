import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Icone } from '@/components/ui/Icone';
import { ecart } from '@/lib/style';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('pages'))('horsLigne'), robots: { index: false } };
}

// Page affichée par le service worker quand une page n'est pas en cache et que le réseau manque.
export default async function HorsLigne() {
  const t = await getTranslations();
  return (
    <main className="conteneur">
      <section className="panneau pile" style={ecart(14, { alignItems: 'center', textAlign: 'center', maxWidth: 560, marginInline: 'auto' })}>
        <Icone nom="wifiOff" taille={56} />
        <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>{t('reseau.coupe')}</h1>
        <p>{t('reseau.verifier')}</p>
        <p className="doux">{t('reseau.billetsDispo')}</p>
        <div className="rangee envelopper" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-principal" href="/mes-billets">{t('reseau.ouvrirBillets')}</Link>
          <Link className="btn" href="/">{t('commun.reessayer')}</Link>
        </div>
      </section>
    </main>
  );
}
