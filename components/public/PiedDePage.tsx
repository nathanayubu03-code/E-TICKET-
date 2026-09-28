import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ecart } from '@/lib/style';
import { Logo } from './Logo';

export async function PiedDePage({ villes }: { villes: string[] }) {
  const t = await getTranslations('pied');
  return (
    <footer className="pied">
      <div className="conteneur">
        <div className="pile" style={ecart(8)}>
          <Logo taille={32} rdc={false} />
          {villes.length > 0 ? <p className="doux">{villes.join(' · ')}</p> : null}
        </div>
        <nav aria-label={t('aria')}>
          <Link href="/aide">{t('aide')}</Link>
          <Link href="/aide#agent">{t('agent')}</Link>
          <Link href="/alertes">{t('alertes')}</Link>
          <Link href="/conditions">{t('conditions')}</Link>
          <Link href="/confidentialite">{t('confidentialite')}</Link>
        </nav>
      </div>
    </footer>
  );
}
