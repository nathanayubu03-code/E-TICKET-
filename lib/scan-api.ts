import { ROLES_SCAN } from './auth/roles';
import { AccesRefuse, exigerRole } from './auth/session';
import { accesScanner } from './scan';

/** Contrôle d'accès des routes du scanner : session CONTROLEUR (ou ADMIN) affectée à l'événement. */
export async function autoriserScanner(evenementId: string) {
  try {
    const s = await exigerRole(ROLES_SCAN, { rediriger: false });
    if (!(await accesScanner(s.user.id, s.user.roles, evenementId))) return null;
    return s;
  } catch (e) {
    if (e instanceof AccesRefuse) return null;
    throw e;
  }
}

export const refus = () => Response.json({ erreur: 'acces_refuse' }, { status: 401 });
