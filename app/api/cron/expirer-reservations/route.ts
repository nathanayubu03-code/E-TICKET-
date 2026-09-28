import { cronAutorise } from '@/lib/cron';
import { expirerReservations } from '@/lib/commandes';

export const dynamic = 'force-dynamic';

// Idempotent : peut être appelée par n'importe quel planificateur, aussi souvent que voulu.
async function traiter(req: Request) {
  if (!cronAutorise(req)) return new Response('Non autorisé', { status: 401 });
  return Response.json({ expirees: await expirerReservations() });
}
export const GET = traiter;
export const POST = traiter;
