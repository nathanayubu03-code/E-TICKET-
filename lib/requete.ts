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

/**
 * Requête POST de notre propre site : l'en-tête Origin, quand il est présent, doit correspondre à l'hôte.
 * Les actions serveur de Next.js font déjà ce contrôle ; cette fonction protège nos routes API internes.
 */
export function memeOrigine(req: Request): boolean {
  const origine = req.headers.get('origin');
  if (!origine) return req.headers.get('sec-fetch-site') !== 'cross-site';
  try {
    const hote = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    return new URL(origine).host === hote;
  } catch {
    return false;
  }
}
