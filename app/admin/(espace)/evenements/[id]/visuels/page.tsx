/* eslint-disable @next/next/no-img-element */
import { BoutonAction } from '@/components/admin/BoutonAction';
import { Champ, FormAuto } from '@/components/admin/FormAuto';
import { evenementAEditer } from '@/lib/admin/charger';
import { couvertureSVG } from '@/lib/kuba';
import type { Variantes } from '@/lib/stockage/affiche';
import { recadrerAffiche, retirerAffiche, televerserAffiche } from '../../actions';

const POSITIONS = [['attention', 'Automatique (zone la plus intéressante)'], ['top', 'Haut'], ['centre', 'Centre'], ['bottom', 'Bas']] as const;

export default async function EtapeVisuels({ params }: { params: Promise<{ id: string }> }) {
  const e = await evenementAEditer((await params).id);
  const v = e.afficheVariantes as Variantes | null;
  return (
    <div className="pile" style={{ ['--gap' as string]: '16px' }}>
      <section className="admin-panneau pile" aria-labelledby="t-aff">
        <h2 id="t-aff" className="titre-section">Affiche</h2>
        <p className="doux">JPEG, PNG, WebP ou AVIF, 8 Mo maximum, 640 pixels de large minimum. Le serveur la recadre en 4:5 et 16:9 et la compresse en WebP et AVIF. Sans affiche, la page utilise un motif Kuba aux couleurs de la catégorie.</p>
        <FormAuto action={televerserAffiche.bind(null, e.id)} auto={false} libelle={v ? "Remplacer l'affiche" : "Téléverser l'affiche"} multipart>
          <Champ nom="affiche" label="Fichier"><input id="affiche" name="affiche" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="champ-texte" style={{ paddingTop: 12 }} /></Champ>
        </FormAuto>
      </section>
      {v ? (
        <section className="admin-panneau pile" aria-labelledby="t-rec">
          <h2 id="t-rec" className="titre-section">Recadrage</h2>
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <figure style={{ margin: 0 }}><img src={v['4x5']?.webp} alt="Affiche au format 4:5" style={{ width: '100%', borderRadius: 12, border: '2px solid var(--encre)' }} /><figcaption className="doux">4:5</figcaption></figure>
            <figure style={{ margin: 0 }}><img src={v['16x9']?.webp} alt="Affiche au format 16:9" style={{ width: '100%', borderRadius: 12, border: '2px solid var(--encre)' }} /><figcaption className="doux">16:9</figcaption></figure>
          </div>
          <FormAuto action={recadrerAffiche.bind(null, e.id)} auto={false} libelle="Appliquer le recadrage">
            <div className="grid gap-4 sm:grid-cols-2">
              {(['4x5', '16x9'] as const).map((f) => (
                <Champ key={f} nom={f} label={`Cadrage ${f.replace('x', ':')}`}>
                  <select id={f} name={f} className="champ-select" defaultValue={v[f]?.position ?? 'attention'}>
                    {POSITIONS.map(([val, lib]) => <option key={val} value={val}>{lib}</option>)}
                  </select>
                </Champ>
              ))}
            </div>
          </FormAuto>
          <BoutonAction classe="lien-bouton" libelle="Retirer l'affiche" confirmation="Retirer l'affiche ? La page reprendra le motif Kuba." action={retirerAffiche.bind(null, e.id)} />
        </section>
      ) : (
        <section className="admin-panneau pile" aria-label="Couverture actuelle">
          <p className="doux">Couverture actuelle (motif Kuba) :</p>
          <div style={{ position: 'relative', height: 160, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--encre)' }} className="couverture" dangerouslySetInnerHTML={{ __html: couvertureSVG(e.id, e.categorie?.fond, { cols: 20, rows: 7 }) }} />
        </section>
      )}
    </div>
  );
}
