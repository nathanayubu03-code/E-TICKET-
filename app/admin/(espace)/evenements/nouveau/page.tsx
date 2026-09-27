import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { FormNouvel } from './FormNouvel';

export const metadata = { title: 'Nouvel événement' };

export default async function NouvelEvenement() {
  await exigerRole(ROLES_EDITION);
  const categories = await db.category.findMany({ orderBy: { ordre: 'asc' }, select: { id: true, nom: true } });
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px', maxWidth: 640 }}>
      <h1 className="affiche" style={{ fontSize: 44 }}>Nouvel événement</h1>
      <div className="admin-panneau"><FormNouvel categories={categories} /></div>
    </div>
  );
}
