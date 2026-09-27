import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = { title: 'Scanner', robots: { index: false }, manifest: '/scan/manifest.webmanifest' };
export const viewport: Viewport = { themeColor: '#14120E' };

export default function LayoutScan({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#14120E', minHeight: '100dvh' }}>{children}</div>;
}
