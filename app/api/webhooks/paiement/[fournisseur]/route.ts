import { traiterWebhook } from '@/lib/paiement';

export const dynamic = 'force-dynamic';

// Webhook des fournisseurs de paiement. Corps lu en brut (la signature porte sur les octets exacts).
export async function POST(req: Request, { params }: { params: Promise<{ fournisseur: string }> }) {
  const corps = await req.text();
  if (corps.length > 64_000) return new Response('Trop volumineux', { status: 413 });
  const r = await traiterWebhook((await params).fournisseur, { corps, entetes: req.headers });
  return Response.json({ message: r.message }, { status: r.code });
}
