import { BoutonAction } from '@/components/admin/BoutonAction';
import { ChampsTypeBillet } from '@/components/admin/ChampsTypeBillet';
import { FormAuto } from '@/components/admin/FormAuto';
import { evenementAEditer } from '@/lib/admin/charger';
import { prixDouble } from '@/lib/argent';
import { utcVersLocal } from '@/lib/fuseaux';
import { enregistrerTypeBillet, supprimerTypeBillet } from '../../actions';

export default async function EtapeBillets({ params }: { params: Promise<{ id: string }> }) {
  const e = await evenementAEditer((await params).id);
  const fuseau = e.fuseau ?? 'Africa/Kinshasa';
  const local = (d: Date | null) => { if (!d) return ''; const l = utcVersLocal(d, fuseau); return `${l.jour}T${l.heure}`; };
  return (
    <div className="pile" style={{ ['--gap' as string]: '16px' }}>
      {e.typesBillet.length === 0 ? <p className="note note-info">Aucune catégorie de billet. Ajoutez-en au moins une avec un prix et un quota pour pouvoir publier.</p> : null}
      {e.typesBillet.map((t) => (
        <section key={t.id} className="admin-panneau pile" aria-label={t.nom}>
          <div className="rangee entre envelopper">
            <h2 className="titre-section">{t.nom} · {prixDouble(t.prixCdf, t.prixUsd)}</h2>
            <BoutonAction classe="lien-bouton" libelle="Supprimer" confirmation={`Supprimer la catégorie « ${t.nom} » ?`} action={supprimerTypeBillet.bind(null, e.id, t.id)} />
          </div>
          <FormAuto action={enregistrerTypeBillet.bind(null, e.id, t.id)}>
            <ChampsTypeBillet suffixe={t.id} vendus={t.quota - t.restant} v={{ nom: t.nom, description: t.description ?? '', prixCdf: t.prixCdf, prixUsd: t.prixUsd === null ? '' : String(t.prixUsd / 100).replace('.', ','), quota: t.quota, venteDebut: local(t.venteDebutLe), venteFin: local(t.venteFinLe), limiteParCommande: t.limiteParCommande ?? '', ordre: t.ordre }} />
          </FormAuto>
        </section>
      ))}
      <section className="admin-panneau pile" aria-labelledby="t-nouveau">
        <h2 id="t-nouveau" className="titre-section">Ajouter une catégorie de billet</h2>
        <FormAuto action={enregistrerTypeBillet.bind(null, e.id, null)} auto={false} libelle="Ajouter" key={e.typesBillet.length}>
          <ChampsTypeBillet suffixe="nouveau" v={{ nom: '', description: '', prixCdf: '', prixUsd: '', quota: '', venteDebut: '', venteFin: '', limiteParCommande: '', ordre: e.typesBillet.length }} />
        </FormAuto>
      </section>
    </div>
  );
}
