import { appareil, manifeste } from '@/lib/scan';
import { autoriserScanner, refus } from '@/lib/scan-api';

export const dynamic = 'force-dynamic';

// Liste des empreintes des billets valides, déjà scannés et annulés : téléchargée avant de scanner.
export async function GET(req: Request, { params }: { params: Promise<{ evenementId: string }> }) {
  const { evenementId } = await params;
  const s = await autoriserScanner(evenementId);
  if (!s) return refus();
  const m = await manifeste(evenementId);
  if (!m) return Response.json({ erreur: 'introuvable' }, { status: 404 });
  const a = await appareil(s.user.id, evenementId, req.headers.get('x-appareil'), req.headers.get('user-agent') ?? undefined);
  return Response.json({ ...m, appareilId: a.id }, { headers: { 'Cache-Control': 'no-store' } });
}
