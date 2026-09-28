import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import * as anybody from '../polices/anybody';
import * as bricolage from '../polices/bricolage';
import * as unbounded from '../polices/unbounded';
import { nom as optionActive } from '../polices/titre';
import { Icone } from '@/components/ui/Icone';
import { cdf } from '@/lib/argent';
import { env, environnementApp } from '@/lib/env';
import { evenementsPublics } from '@/lib/evenements';
import { OPERATEURS } from '@/lib/operateurs';

// Comparaison des trois polices de titre, en 360 px. Jamais servie en production.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Test typographie', robots: { index: false, follow: false } };

const OPTIONS = [
  { n: 1, libelle: 'Option 1 : Bricolage Grotesque 700', ...bricolage },
  { n: 2, libelle: 'Option 2 : Unbounded 500', ...unbounded },
  { n: 3, libelle: 'Option 3 : Anybody 700, largeur 90 %', ...anybody },
];

export default async function TestTypo() {
  if (environnementApp(env()) === 'production') notFound();
  // Un vrai événement publié s'il en existe un ; sinon des libellés neutres, marqués comme exemple.
  const e = (await evenementsPublics())[0];
  const titre = e?.titre ?? "Titre de l'événement (exemple)";
  const lieu = e ? [e.lieu?.nom, e.ville?.nom].filter(Boolean).join(', ') : 'Salle, ville (exemple)';
  const types = e?.typesBillet.length ? e.typesBillet.slice(0, 2).map((t) => ({ nom: t.nom, prix: t.prixCdf })) : [{ nom: 'Catégorie A', prix: 10000 }, { nom: 'Catégorie B', prix: 25000 }];
  const montant = cdf(types[0]!.prix * 2);

  return (
    <main className="conteneur pile" style={{ gap: 24, paddingBlock: 24 }}>
      <section className="panneau pile" style={{ gap: 8 }}>
        <h1 className="titre-section">Choix de la police des titres</h1>
        <p>Option active sur le site : <b>{optionActive}</b>. Pour changer, modifier la ligne d&apos;export de <code>app/polices/titre.ts</code>.</p>
        <p className="doux" style={{ fontSize: 'var(--t-petit)' }}>Texte courant en Atkinson Hyperlegible 16 px dans les trois options. Page visible seulement en development et en staging.</p>
      </section>
      <div className="test-typo-grille">
        {OPTIONS.map((o) => (
          <div key={o.nom} data-typo={o.nom} className={`${o.police.variable} test-typo-colonne pile`} data-testid={`option-${o.n}`}>
            <h2 className="badge badge-neutre" style={{ alignSelf: 'flex-start' }}>{o.libelle}</h2>

            <article className="panneau une">
              <div className="bandeau"><span className="etiquette">À la une</span><span className="tampon" aria-hidden="true"><b>12</b><span>DÉC.</span></span></div>
              <div className="corps">
                <span style={{ fontWeight: 700 }}>Concert</span>
                <h3 className="affiche" style={{ fontSize: 'var(--t-titre-accueil)' }}>{titre}</h3>
                <div className="meta"><span><Icone nom="cal" />Sam. 12 déc. · 20:00</span><span><Icone nom="pin" />{lieu}</span></div>
                <div className="rangee entre"><div className="prix"><b>{cdf(types[0]!.prix)}</b></div><span className="btn btn-principal btn-grand">Réserver</span></div>
              </div>
            </article>

            <div className="carte">
              <div className="vignette" style={{ background: 'var(--surface-2)' }}><span className="date">12<small>DÉC.</small></span></div>
              <div className="corps">
                <span className="doux" style={{ fontSize: 'var(--t-petit)', fontWeight: 700 }}>Concert</span>
                <h3>{titre}</h3>
                <span className="doux">{lieu}</span>
                <div className="bas"><b>{cdf(types[0]!.prix)}</b><span className="badge badge-danger">Plus que 12 places</span></div>
              </div>
            </div>

            <div className="panneau pile" style={{ gap: 12 }}>
              <h3 className="titre-section">Choisissez vos billets</h3>
              {types.map((t, i) => (
                <div key={t.nom} className={`categorie-billet${i === 0 ? ' choisie' : ''}`}>
                  <div className="rangee entre"><h3>{t.nom}</h3><span className="badge badge-neutre">Disponible</span></div>
                  <div className="rangee entre">
                    <div className="prix"><b style={{ fontSize: 'var(--t-prix)' }}>{cdf(t.prix)}</b></div>
                    <div className="compteur"><button type="button" aria-label="Retirer"><Icone nom="minus" taille={22} /></button><output>{i === 0 ? 2 : 0}</output><button type="button" className="plus" aria-label="Ajouter"><Icone nom="plus" taille={22} /></button></div>
                  </div>
                </div>
              ))}
              <span className="btn btn-principal btn-grand btn-plein">Continuer</span>
            </div>

            <div className="panneau pile" style={{ gap: 14 }}>
              <h3 className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>Payer avec</h3>
              <div className="operateurs">
                {OPERATEURS.map((op, i) => (
                  <span key={op.k} className="operateur" aria-pressed={i === 0} style={{ background: op.fond, color: op.texte }}>
                    <span><b>{op.nom}</b><br /><small>{op.prefixes.slice(0, 3).map((p) => p.slice(1)).join(' · ')}</small></span>
                  </span>
                ))}
              </div>
              <div className="pile" style={{ gap: 8, padding: 18, border: '2px solid var(--encre)', borderRadius: 18 }}>
                <span className="doux" style={{ fontWeight: 700 }}>Montant exact à valider</span>
                <span className="montant">{montant}</span>
              </div>
              <span className="btn btn-principal btn-grand">Payer {montant}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
