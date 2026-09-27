import { ChampsOrganisateur } from '@/components/admin/ChampsOrganisateur';
import { FormAuto } from '@/components/admin/FormAuto';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { parametre } from '@/lib/parametres';
import { enregistrerOrganisateur } from '../actions';

export const metadata = { title: 'Nouvel organisateur' };

export default async function NouvelOrganisateur() {
  await exigerRole(ROLES_EDITION);
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <h1 className="affiche" style={{ fontSize: 44 }}>Nouvel organisateur</h1>
      <section className="admin-panneau">
        <FormAuto action={enregistrerOrganisateur.bind(null, null)} auto={false} libelle="Créer">
          <ChampsOrganisateur tauxGlobal={await parametre('commission_bps')} v={{ nom: '', contactNom: '', telephone: '', email: '', reversementOperateur: '', reversementFin: null, commission: '', verifie: false }} />
        </FormAuto>
      </section>
    </div>
  );
}
