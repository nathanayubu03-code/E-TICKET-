import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { COOKIE_LANGUE, LANGUE_PAR_DEFAUT, estLangue } from './config';
import { fusionner } from './fusion';

// Le français et l'anglais sont complets (test tests/unit/traductions.test.ts). Le lingala et le swahili ne contiennent que des clés relues ;
// toute clé absente retombe sur le français. Aucune traduction automatique.
export default getRequestConfig(async () => {
  const valeur = (await cookies()).get(COOKIE_LANGUE)?.value;
  const locale = estLangue(valeur) ? valeur : LANGUE_PAR_DEFAUT;
  const fr = (await import('../messages/fr.json')).default;
  if (locale === 'fr') return { locale, messages: fr, timeZone: 'Africa/Kinshasa' };
  const autre = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages: fusionner(fr, autre), timeZone: 'Africa/Kinshasa' };
});
