import { BoutonAction } from '@/components/admin/BoutonAction';
import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { evenementAEditer } from '@/lib/admin/charger';
import { enregistrerLigneProgramme, supprimerLigneProgramme } from '../../actions';

function Champs({ s, v }: { s: string; v: { heure: string; titre: string; detail: string; ordre: number } }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[120px_1fr_1fr_100px]">
      <Champ nom="heure" id={`heure-${s}`} label="Heure"><input id={`heure-${s}`} name="heure" type="time" className="champ-texte" defaultValue={v.heure} /></Champ>
      <Champ nom="titre" id={`titre-${s}`} label="Titre"><input id={`titre-${s}`} name="titre" className="champ-texte" defaultValue={v.titre} maxLength={120} /></Champ>
      <Champ nom="detail" id={`detail-${s}`} label="Détail (facultatif)"><input id={`detail-${s}`} name="detail" className="champ-texte" defaultValue={v.detail} maxLength={200} /></Champ>
      <Champ nom="ordre" id={`ordre-${s}`} label="Ordre"><input id={`ordre-${s}`} name="ordre" type="number" min={0} className="champ-texte" defaultValue={v.ordre} /></Champ>
    </div>
  );
}

export default async function EtapeProgramme({ params }: { params: Promise<{ id: string }> }) {
  const e = await evenementAEditer((await params).id);
  return (
    <div className="pile" style={{ ['--gap' as string]: '16px' }}>
      <p className="doux">Facultatif. Sans ligne, la page publique n&apos;affiche pas de programme. Heures dans le fuseau de la ville.</p>
      {e.programme.map((p) => (
        <section key={p.id} className="admin-panneau pile">
          <FormAuto action={enregistrerLigneProgramme.bind(null, e.id, p.id)}>
            <Champs s={p.id} v={{ heure: p.heure, titre: p.titre, detail: p.detail ?? '', ordre: p.ordre }} />
          </FormAuto>
          <BoutonAction classe="lien-bouton" libelle="Supprimer la ligne" action={supprimerLigneProgramme.bind(null, e.id, p.id)} />
        </section>
      ))}
      <section className="admin-panneau pile" aria-labelledby="t-ligne">
        <h2 id="t-ligne" className="titre-section">Ajouter une ligne</h2>
        <FormAuto action={enregistrerLigneProgramme.bind(null, e.id, null)} auto={false} libelle="Ajouter" key={e.programme.length}>
          <Champs s="nouveau" v={{ heure: '', titre: '', detail: '', ordre: e.programme.length }} />
        </FormAuto>
      </section>
    </div>
  );
}
