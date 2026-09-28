import type { Metadata, Viewport } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('pages'))('scanner'), robots: { index: false }, manifest: '/manifeste-scanner.webmanifest' };
}
export const viewport: Viewport = { themeColor: '#14120E' };

export default function LayoutScan({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#14120E', minHeight: '100dvh' }}>{children}</div>;
}
