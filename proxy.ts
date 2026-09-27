import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ROLES, lireRoles } from '@/lib/auth/jeton-roles';
import { aUnRole, rolesPourChemin, ROLES_SCAN } from '@/lib/auth/roles';

// Premier contrôle d'accès, sans base de données : jeton de rôles signé. Chaque page et action
// serveur revérifie en base (exigerRole). Ajoute aussi les en-têtes de sécurité et la CSP.
export async function proxy(req: NextRequest) {
  const chemin = req.nextUrl.pathname;
  const protege = (chemin.startsWith('/admin') && chemin !== '/admin/connexion') || chemin === '/scan' || chemin.startsWith('/scan/');
  if (protege) {
    const roles = chemin.startsWith('/scan') ? ROLES_SCAN : rolesPourChemin(chemin);
    const jeton = await lireRoles(req.cookies.get(COOKIE_ROLES)?.value, process.env.SESSION_SECRET ?? '');
    if (!roles || !jeton || !jeton.deuxiemeEtape || !aUnRole(jeton.roles, roles)) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/connexion';
      url.search = `?suite=${encodeURIComponent(chemin)}`;
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.svg|motifs/|icones/|sw.js|swe-worker|manifest.webmanifest|manifeste-scanner.webmanifest|api/sante).*)'],
};
