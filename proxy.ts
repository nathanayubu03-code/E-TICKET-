import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ROLES, lireRoles } from '@/lib/auth/jeton-roles';
import { aUnRole, rolesPourChemin, ROLES_SCAN } from '@/lib/auth/roles';

// 1. Premier contrôle d'accès, sans base de données : jeton de rôles signé. Chaque page et action
//    serveur revérifie en base (exigerRole).
// 2. En-têtes de sécurité et Content-Security-Policy stricte avec un nonce par requête.

function politique(nonce: string): string {
  const dev = process.env.NODE_ENV === 'development';
  const images = ["'self'", 'blob:', 'data:'];
  const s3 = process.env.S3_PUBLIC_URL;
  if (s3) try { images.push(new URL(s3).origin); } catch { /* URL invalide : ignorée */ }
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    // Les attributs style de React (valeurs dynamiques du motif, jauges) exigent 'unsafe-inline' pour les styles.
    // Aucun script inline n'est autorisé sans nonce.
    "style-src 'self' 'unsafe-inline'",
    `img-src ${images.join(' ')}`,
    "font-src 'self'",
    `connect-src 'self'${dev ? ' ws: wss:' : ''}`,
    "media-src 'self' blob:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

function entetesSecurite(r: NextResponse, csp: string) {
  r.headers.set('Content-Security-Policy', csp);
  r.headers.set('X-Content-Type-Options', 'nosniff');
  r.headers.set('X-Frame-Options', 'DENY');
  r.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  r.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  // Caméra pour le scanner uniquement, sur notre origine.
  r.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
  if (process.env.NODE_ENV === 'production') r.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return r;
}

export async function proxy(req: NextRequest) {
  const chemin = req.nextUrl.pathname;
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = politique(nonce);

  const protege = (chemin.startsWith('/admin') && chemin !== '/admin/connexion') || chemin === '/scan' || chemin.startsWith('/scan/');
  if (protege) {
    const roles = chemin.startsWith('/scan') ? ROLES_SCAN : rolesPourChemin(chemin);
    const jeton = await lireRoles(req.cookies.get(COOKIE_ROLES)?.value, process.env.SESSION_SECRET ?? '');
    if (!roles || !jeton || !jeton.deuxiemeEtape || !aUnRole(jeton.roles, roles)) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/connexion';
      url.search = `?suite=${encodeURIComponent(chemin)}`;
      return entetesSecurite(NextResponse.redirect(url), csp);
    }
  }

  const entetes = new Headers(req.headers);
  entetes.set('x-nonce', nonce);
  entetes.set('Content-Security-Policy', csp);
  return entetesSecurite(NextResponse.next({ request: { headers: entetes } }), csp);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.svg|motifs/|icones/|sw.js|swe-worker|manifest.webmanifest|manifeste-scanner.webmanifest|api/sante).*)'],
};
