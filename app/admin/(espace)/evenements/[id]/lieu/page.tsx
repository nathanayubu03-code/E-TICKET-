import { ChoixLieu } from '@/components/admin/ChoixLieu';
import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { evenementAEditer } from '@/lib/admin/charger';
import { db } from '@/lib/db';
import { utcVersLocal } from '@/lib/fuseaux';
import { enregistrerLieu } from '../../actions';

export default async function EtapeLieu({ params }: { params: Promise<{ id: string }> }) {
  const e = await evenementAEditer((await params).id);
  const villes = await db.city.findMany({ orderBy: { nom: 'asc' }, include: { lieux: { orderBy: { nom: 'asc' } } } });
  const fuseau = e.fuseau ?? 'Africa/Kinshasa';
  const debut = e.debutLe ? utcVersLocal(e.debutLe, fuseau) : null;
  const portes = e.ouverturePortesLe ? utcVersLocal(e.ouverturePortesLe, fuseau) : null;
  const fin = e.finLe ? utcVersLocal(e.finLe, fuseau) : null;
  const villesClient = villes.map((v) => ({ id: v.id, nom: v.nom, fuseau: v.fuseau, lieux: v.lieux.map((l) => ({ id: l.id, nom: l.nom, adresse: l.adresse, latitude: l.latitude?.toString() ?? null, longitude: l.longitude?.toString() ?? null })) }));
  return (
    <section className="admin-panneau" aria-label="Lieu et date">
      <FormAuto action={enregistrerLieu.bind(null, e.id)}>
        <ChoixLieu villes={villesClient} villeId={e.villeId ?? ''} lieuId={e.lieuId ?? ''} />
        <div className="grid gap-4 sm:grid-cols-4">
          <Champ nom="jour" label="Date"><input id="jour" name="jour" type="date" className="champ-texte" defaultValue={debut?.jour ?? ''} /></Champ>
          <Champ nom="portes" label="Ouverture des portes"><input id="portes" name="portes" type="time" className="champ-texte" defaultValue={portes?.heure ?? ''} /></Champ>
          <Champ nom="debut" label="Début"><input id="debut" name="debut" type="time" className="champ-texte" defaultValue={debut?.heure ?? ''} /></Champ>
          <Champ nom="fin" label="Fin (facultatif)"><input id="fin" name="fin" type="time" className="champ-texte" defaultValue={fin?.heure ?? ''} /></Champ>
        </div>
      </FormAuto>
    </section>
  );
}
