import { z } from 'zod';
import { appareilAutorise, synchroniser } from '@/lib/scan';
import { autoriserScanner, refus } from '@/lib/scan-api';

export const dynamic = 'force-dynamic';

const schema = z.object({
  appareilId: z.string().min(10).max(40),
  scans: z.array(z.object({
    scanClientId: z.string().min(8).max(64), empreinte: z.string().regex(/^[0-9a-f]{64}$/).nullable(), brut: z.string().max(200),
    resultatLocal: z.enum(['VALIDE', 'DEJA_SCANNE', 'REFUSE', 'INCONNU']), scanneLe: z.iso.datetime(), porte: z.string().max(60).nullable(),
  })).max(500),
});

export async function POST(req: Request, { params }: { params: Promise<{ evenementId: string }> }) {
  const { evenementId } = await params;
  const s = await autoriserScanner(evenementId);
  if (!s) return refus();
  const r = schema.safeParse(await req.json().catch(() => null));
  if (!r.success) return Response.json({ erreur: 'requete_invalide' }, { status: 400 });
  if (!(await appareilAutorise(r.data.appareilId, s.user.id, evenementId))) return refus();
  return Response.json(await synchroniser({ evenementId, appareilId: r.data.appareilId, controleurId: s.user.id, scans: r.data.scans }));
}
