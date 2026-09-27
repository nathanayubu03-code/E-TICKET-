import { ROLES_ADMIN } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';

export const metadata = { title: 'Tableau de bord' };

export default async function TableauDeBord() {
  await exigerRole(ROLES_ADMIN);
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <h1 className="affiche" style={{ fontSize: 44 }}>Tableau de bord</h1>
      <div className="admin-panneau"><p>Aucune vente pour le moment.</p></div>
    </div>
  );
}
