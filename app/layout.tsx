import type { Metadata, Viewport } from 'next';
import { Anybody, Atkinson_Hyperlegible } from 'next/font/google';
import { cookies } from 'next/headers';
import { getLocale, getTranslations } from 'next-intl/server';
import { environnementApp, lireEnv } from '@/lib/env';
import './globals.css';

const anybody = Anybody({ subsets: ['latin'], axes: ['wdth'], variable: '--font-anybody', display: 'swap' });
const atkinson = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-atkinson', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'e-Ticket RDC', template: '%s · e-Ticket RDC' },
  description: 'Billets de concerts, matchs, festivals et spectacles en RDC. Paiement Airtel Money, M-Pesa, Orange Money, Afrimoney.',
  icons: { icon: '/logo.svg' },
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF5E6' },
    { media: '(prefers-color-scheme: dark)', color: '#0D0C0A' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get('et-theme')?.value;
  const locale = await getLocale();
  const staging = environnementApp(lireEnv()) === 'staging';
  const t = await getTranslations('commun');
  return (
    <html lang={locale} data-theme={theme === 'dark' || theme === 'light' ? theme : undefined} data-app-env={staging ? 'staging' : undefined} className={`${anybody.variable} ${atkinson.variable}`}>
      <body>
        {staging ? <div className="bandeau-test" role="note">{t('bandeauTest')}</div> : null}
        {children}
      </body>
    </html>
  );
}
