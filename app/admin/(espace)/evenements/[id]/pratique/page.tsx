import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { evenementAEditer } from '@/lib/admin/charger';
import { parametre } from '@/lib/parametres';
import { enregistrerPratique } from '../../actions';

export default async function EtapePratique({ params }: { params: Promise<{ id: string }> }) {
  const e = await evenementAEditer((await params).id);
  const max = await parametre('limite_billets');
  return (
    <section className="admin-panneau" aria-label="Infos pratiques">
      <FormAuto action={enregistrerPratique.bind(null, e.id)}>
        <p className="doux">La page publique affiche toujours les trois règles « À savoir » (1 billet = 1 entrée, billet hors ligne, remboursement si annulation). Ajoutez ici ce qui est propre à cet événement : accès, parking, objets interdits, âge minimum.</p>
        <Champ nom="infosPratiques" label="Informations pratiques"><textarea id="infosPratiques" name="infosPratiques" className="champ-zone" defaultValue={e.infosPratiques ?? ''} rows={6} maxLength={3000} /></Champ>
        <Champ nom="infosPratiquesEn" label="Informations pratiques en anglais (facultatif)" aide="Laissées vides, le site affiche le français."><textarea id="infosPratiquesEn" name="infosPratiquesEn" lang="en" className="champ-zone" defaultValue={e.infosPratiquesEn ?? ''} rows={5} maxLength={3000} /></Champ>
        <Champ nom="limiteParPersonne" label="Limite de billets par personne" aide={`Vide : limite globale (${max}).`}><input id="limiteParPersonne" name="limiteParPersonne" type="number" min={1} max={20} className="champ-texte" defaultValue={e.limiteParPersonne ?? ''} style={{ maxWidth: 160 }} /></Champ>
      </FormAuto>
    </section>
  );
}
