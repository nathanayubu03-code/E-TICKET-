import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { evenementAEditer } from '@/lib/admin/charger';
import { db } from '@/lib/db';
import { enregistrerInfos } from '../../actions';

export default async function EtapeInfos({ params }: { params: Promise<{ id: string }> }) {
  const e = await evenementAEditer((await params).id);
  const [categories, organisateurs] = await Promise.all([
    db.category.findMany({ orderBy: { ordre: 'asc' } }),
    db.organizer.findMany({ where: { archiveLe: null }, orderBy: { nom: 'asc' }, select: { id: true, nom: true } }),
  ]);
  return (
    <section className="admin-panneau" aria-label="Informations">
      <FormAuto action={enregistrerInfos.bind(null, e.id)}>
        <Champ nom="titre" label="Titre"><input id="titre" name="titre" className="champ-texte" defaultValue={e.titre} maxLength={140} /></Champ>
        <Champ nom="sousTitre" label="Sous-titre (artistes, équipes)" aide="Facultatif. Affiché sous le titre."><input id="sousTitre" name="sousTitre" className="champ-texte" defaultValue={e.sousTitre ?? ''} maxLength={200} /></Champ>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ nom="categorieId" label="Catégorie">
            <select id="categorieId" name="categorieId" className="champ-select" defaultValue={e.categorieId ?? ''}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </Champ>
          <Champ nom="genre" label="Genre" aide="Facultatif. Exemple : rumba, match amical, théâtre."><input id="genre" name="genre" className="champ-texte" defaultValue={e.genre ?? ''} maxLength={60} /></Champ>
        </div>
        <Champ nom="organisateurId" label="Organisateur" aide={organisateurs.length === 0 ? "Aucun organisateur : créez-en un dans « Organisateurs »." : undefined}>
          <select id="organisateurId" name="organisateurId" className="champ-select" defaultValue={e.organisateurId ?? ''}>
            <option value="">Aucun pour l&apos;instant</option>
            {organisateurs.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
          </select>
        </Champ>
        <Champ nom="description" label="Description"><textarea id="description" name="description" className="champ-zone" defaultValue={e.description ?? ''} maxLength={5000} rows={6} /></Champ>
        <fieldset className="pile" style={{ gap: 12, border: '2px dashed var(--trait)', borderRadius: 14, padding: 14 }}>
          <legend style={{ fontWeight: 700, padding: '0 6px' }}>Version anglaise (facultatif)</legend>
          <p className="aide-champ">Affichée aux visiteurs qui ont choisi EN. Laissée vide, le site affiche le français. Aucune traduction automatique.</p>
          <Champ nom="titreEn" label="Titre en anglais"><input id="titreEn" name="titreEn" lang="en" className="champ-texte" defaultValue={e.titreEn ?? ''} maxLength={140} /></Champ>
          <Champ nom="descriptionEn" label="Description en anglais"><textarea id="descriptionEn" name="descriptionEn" lang="en" className="champ-zone" defaultValue={e.descriptionEn ?? ''} maxLength={5000} rows={5} /></Champ>
        </fieldset>
      </FormAuto>
    </section>
  );
}
