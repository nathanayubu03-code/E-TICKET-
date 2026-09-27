import { env } from '@/lib/env';
import { stockage } from '@/lib/stockage';

const TYPES: Record<string, string> = { webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg' };

// Sert les fichiers du stockage local (développement). Avec R2, les URL pointent vers S3_PUBLIC_URL.
export async function GET(_req: Request, { params }: { params: Promise<{ cle: string[] }> }) {
  const cle = (await params).cle.join('/');
  if (!cle.startsWith('affiches/') || cle.includes('/original-') || cle.includes('..')) return new Response('Introuvable', { status: 404 });
  if (env().STORAGE_DRIVER !== 'local') return new Response('Introuvable', { status: 404 });
  const contenu = await stockage().lire(cle);
  if (!contenu) return new Response('Introuvable', { status: 404 });
  return new Response(new Uint8Array(contenu), { headers: { 'Content-Type': TYPES[cle.split('.').pop() ?? ''] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}
