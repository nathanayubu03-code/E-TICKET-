import { headers } from 'next/headers';

/** Adresse IP du client (Vercel renseigne x-forwarded-for). */
export async function ipClient(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'inconnue').slice(0, 64);
}

/** Le champ piège est invisible pour un humain : s'il est rempli, c'est un robot. */
export function estRobot(formData: FormData): boolean {
  const v = formData.get('site_web');
  return typeof v === 'string' && v.trim() !== '';
}
