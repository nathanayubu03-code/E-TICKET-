import { expirerReservations } from '@/lib/commandes';
import { cronAutorise } from '@/lib/cron';
import { verifierPaiementsEnAttente } from '@/lib/paiement';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Idempotente : vérifie les paiements sans webhook puis expire les réservations échues.
// Appelée par Vercel Cron (vercel.json) ou par tout planificateur externe avec CRON_SECRET.
async function traiter(req: Request) {
  if (!cronAutorise(req)) return new Response('Non autorisé', { status: 401 });
  const paiements = await verifierPaiementsEnAttente();
  const expirees = await expirerReservations();
  return Response.json({ ...paiements, expirees });
}
export const GET = traiter;
export const POST = traiter;
