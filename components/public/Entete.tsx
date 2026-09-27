import Link from 'next/link';
import { cookies } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { estLangue, LANGUE_PAR_DEFAUT } from '@/i18n/config';
import { Logo } from './Logo';
import { NavPrincipale } from './NavPrincipale';
import { BandeauReseau, BasculeTheme, ChoixLangue } from './OutilsEntete';

export async function Entete({ connecte = false, navigation = true }: { connecte?: boolean; navigation?: boolean }) {
  const t = await getTranslations('entete');
  const tr = await getTranslations('reseau');
  const locale = await getLocale();
  const themeCookie = (await cookies()).get('et-theme')?.value;
  const theme = themeCookie === 'dark' || themeCookie === 'light' ? themeCookie : undefined;
  return (
    <>
      <BandeauReseau texte={tr('horsLigne')} />
      <header className="entete">
        <div className="conteneur">
          <Logo label={t('accueil')} />
          {navigation ? (
            <NavPrincipale
              label={t('principale')}
              liens={[
                { href: '/', texte: t('evenements') },
                { href: '/mes-billets', texte: t('billets') },
                { href: '/organisateurs', texte: t('orga') },
              ]}
            />
          ) : null}
          <div className="outils">
            <ChoixLangue langue={estLangue(locale) ? locale : LANGUE_PAR_DEFAUT} label={t('langue')} />
            <BasculeTheme labelSombre={t('themeSombre')} labelClair={t('themeClair')} theme={theme} />
            {navigation && !connecte ? (
              <Link className="btn btn-principal" href="/connexion" style={{ minHeight: 48 }}>{t('connexion')}</Link>
            ) : null}
          </div>
        </div>
      </header>
    </>
  );
}
