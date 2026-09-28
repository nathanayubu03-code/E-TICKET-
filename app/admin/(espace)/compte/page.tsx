import type { Metadata } from 'next';
import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { ROLES_ADMIN } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { masquerTelephone } from '@/lib/telephone';
import { changerMotDePasse, changerNom } from './actions';

export const metadata: Metadata = { title: 'Mon compte' };

export default async function MonCompte() {
  const s = await exigerRole(ROLES_ADMIN);
  return (
    <div className="pile" style={{ gap: 24 }}>
      <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Mon compte</h1>
      <p>Connexion avec le numéro <b>{masquerTelephone(s.user.telephone)}</b>, le mot de passe, puis le code reçu par SMS.</p>
      <section className="admin-panneau" aria-labelledby="t-nom">
        <h2 id="t-nom" className="titre-section">Nom affiché</h2>
        <FormAuto action={changerNom} auto={false}>
          <Champ nom="nom" label="Nom"><input id="nom" name="nom" className="champ-texte" defaultValue={s.user.nom ?? ''} maxLength={80} autoComplete="name" /></Champ>
        </FormAuto>
      </section>
      <section className="admin-panneau" aria-labelledby="t-mdp">
        <h2 id="t-mdp" className="titre-section">Mot de passe</h2>
        <FormAuto action={changerMotDePasse} auto={false} libelle="Changer le mot de passe">
          <Champ nom="actuel" label="Mot de passe actuel"><input id="actuel" name="actuel" type="password" className="champ-texte" autoComplete="current-password" /></Champ>
          <Champ nom="nouveau" label="Nouveau mot de passe" aide="12 caractères minimum, avec au moins une lettre et un chiffre."><input id="nouveau" name="nouveau" type="password" className="champ-texte" autoComplete="new-password" /></Champ>
          <Champ nom="confirmation" label="Confirmer le nouveau mot de passe"><input id="confirmation" name="confirmation" type="password" className="champ-texte" autoComplete="new-password" /></Champ>
        </FormAuto>
      </section>
    </div>
  );
}
