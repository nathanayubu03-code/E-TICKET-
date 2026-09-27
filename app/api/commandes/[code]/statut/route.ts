import { commandeDeLAcheteur } from '@/lib/achat';
import { sessionCourante } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// Sondé toutes les 3 secondes par l'écran d'attente. Lit notre base, jamais l'opérateur.
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const c = await commandeDeLAcheteur((await params).code, await sessionCourante());
  if (!c) return Response.json({ erreur: 'introuvable' }, { status: 404 });
  const p = c.paiements[0];
  return Response.json({ commande: c.statut, paiement: p?.statut ?? null, paiementId: p?.id ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}
