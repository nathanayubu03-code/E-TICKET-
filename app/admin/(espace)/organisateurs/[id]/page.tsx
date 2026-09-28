import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BoutonAction } from '@/components/admin/BoutonAction';
import { ChampsOrganisateur } from '@/components/admin/ChampsOrganisateur';
import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { ROLES_EDITION } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { parametre } from '@/lib/parametres';
import { masquerTelephone } from '@/lib/telephone';
import { archiverOrganisateur, creerAccesOrganisateur, enregistrerOrganisateur, voirNumeroReversement } from '../actions';

export default async function FicheOrganisateur({ params }: { params: Promise<{ id: string }> }) {
  await exigerRole(ROLES_EDITION);
  const { id } = await params;
  const o = await db.organizer.findUnique({ where: { id }, include: { membres: { select: { id: true, telephone: true } }, evenements: { select: { id: true, titre: true, statut: true }, orderBy: { creeLe: 'desc' }, take: 20 } } });
  if (!o) notFound();
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <Link href="/admin/organisateurs" className="lien-bouton">Tous les organisateurs</Link>
      <h1 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>{o.nom}</h1>
      <section className="admin-panneau">
        <FormAuto action={enregistrerOrganisateur.bind(null, o.id)}>
          <ChampsOrganisateur tauxGlobal={await parametre('commission_bps')} v={{ nom: o.nom, contactNom: o.contactNom ?? '', telephone: o.telephone ?? '', email: o.email ?? '', reversementOperateur: o.reversementOperateur ?? '', reversementFin: o.reversementNumeroFin, commission: o.commissionBps === null ? '' : String(o.commissionBps / 100), verifie: o.verifie }} />
        </FormAuto>
      </section>
      {o.reversementNumeroFin ? (
        <section className="admin-panneau pile" aria-label="Numéro de reversement">
          <p>Numéro de reversement enregistré (se termine par {o.reversementNumeroFin}). Chaque affichage est inscrit au journal d&apos;audit.</p>
          <BoutonAction libelle="Afficher le numéro complet" action={voirNumeroReversement.bind(null, o.id)} />
        </section>
      ) : null}
      <section className="admin-panneau pile" aria-labelledby="t-acces">
        <h2 id="t-acces" className="titre-section">Accès de l&apos;organisateur</h2>
        <p className="doux">Lecture seule au lancement : ventes et reversements de ses événements. Connexion par mot de passe et code SMS.</p>
        {o.membres.length ? <ul>{o.membres.map((m) => <li key={m.id}>{masquerTelephone(m.telephone)}</li>)}</ul> : null}
        <FormAuto action={creerAccesOrganisateur.bind(null, o.id)} auto={false} libelle="Créer l'accès">
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ nom="telephone" id="acces-tel" label="Numéro de connexion"><input id="acces-tel" name="telephone" type="tel" className="champ-texte" autoComplete="off" /></Champ>
            <Champ nom="motDePasse" id="acces-mdp" label="Mot de passe"><input id="acces-mdp" name="motDePasse" type="password" className="champ-texte" autoComplete="new-password" /></Champ>
          </div>
        </FormAuto>
      </section>
      <section className="admin-panneau pile">
        <h2 className="titre-section">Événements</h2>
        {o.evenements.length ? <ul>{o.evenements.map((e) => <li key={e.id}><Link href={`/admin/evenements/${e.id}/infos`}>{e.titre}</Link></li>)}</ul> : <p>Aucun événement.</p>}
        <BoutonAction classe="lien-bouton" libelle="Archiver l'organisateur" confirmation="Archiver cet organisateur ?" action={archiverOrganisateur.bind(null, o.id)} />
      </section>
    </div>
  );
}
