import { z } from 'zod';
import { estIdentifiantBillet, lireContenuQR } from '@/lib/billets/contenu';
import { appareilAutorise, verifierEnLigne } from '@/lib/scan';
import { memeOrigine } from '@/lib/requete';
import { autoriserScanner, refus } from '@/lib/scan-api';

export const dynamic = 'force-dynamic';

const schema = z.object({ scanClientId: z.string().min(8).max(64), brut: z.string().max(200), appareilId: z.string().min(10).max(40), porte: z.string().max(60).nullable(), scanneLe: z.iso.datetime() });

export async function POST(req: Request, { params }: { params: Promise<{ evenementId: string }> }) {
  if (!memeOrigine(req)) return Response.json({ erreur: 'origine' }, { status: 403 });
  const { evenementId } = await params;
  const s = await autoriserScanner(evenementId);
  if (!s) return refus();
  const r = schema.safeParse(await req.json().catch(() => null));
  if (!r.success) return Response.json({ erreur: 'requete_invalide' }, { status: 400 });
  if (!(await appareilAutorise(r.data.appareilId, s.user.id, evenementId))) return refus();
  const d = r.data;
  const resultat = await verifierEnLigne({ ...d, evenementId, controleurId: s.user.id, scanneLe: new Date(d.scanneLe), horsLigne: false, contenu: lireContenuQR(d.brut), publicId: estIdentifiantBillet(d.brut) ? d.brut.trim().toUpperCase() : null });
  return Response.json(resultat);
}
