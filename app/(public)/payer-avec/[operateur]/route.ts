import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_OPERATEUR, FICHIERS_LOGOS } from '@/lib/operateurs';

// Clic sur un opérateur dans le bloc « Payer avec Mobile Money » : l'opérateur est retenu pour le
// prochain paiement (présélectionné sur l'écran de paiement), puis on montre les événements en vente.
export function GET(req: NextRequest, { params }: { params: Promise<{ operateur: string }> }) {
  return params.then(({ operateur }) => {
    const k = Object.entries(FICHIERS_LOGOS).find(([, f]) => f === operateur)?.[0];
    const r = NextResponse.redirect(new URL('/#evenements', req.url));
    if (k) r.cookies.set(COOKIE_OPERATEUR, k, { path: '/', maxAge: 180 * 86400, sameSite: 'lax', httpOnly: false });
    return r;
  });
}
