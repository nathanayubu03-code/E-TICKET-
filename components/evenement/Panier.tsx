'use client';

import { useMemo, useState } from 'react';
import { Icone } from '@/components/ui/Icone';
import { cdf, usd } from '@/lib/argent';
import { ecart } from '@/lib/style';

export interface TypePanier { id: string; nom: string; description: string | null; prixCdf: number; restant: number; limiteParCommande: number | null; etat: 'ouvert' | 'pasEncore' | 'termine'; ouvertureTexte?: string }
export interface TextesPanier {
  vosBillets: string; maxParPersonne: string; epuise: string; plusQue: string; disponible: string; venteTerminee: string;
  retirer: string; ajouter: string; quantite: string; limite: string; aucunChoisi: string; unBillet: string; plusieursBillets: string; continuer: string; gratuit: string;
}

const remplir = (modele: string, v: Record<string, string | number>) => modele.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

export function Panier({ slug, types, max, taux, langue, textes }: { slug: string; types: TypePanier[]; max: number; taux: number | null; langue?: string; textes: TextesPanier }) {
  const [q, setQ] = useState<Record<string, number>>({});
  const total = Object.values(q).reduce((a, b) => a + b, 0);
  const montant = types.reduce((s, c) => s + (q[c.id] ?? 0) * c.prixCdf, 0);
  const lien = useMemo(() => {
    const lignes = types.filter((c) => (q[c.id] ?? 0) > 0).map((c) => `${c.id}:${q[c.id]}`).join(',');
    return `/achat/nouveau?e=${encodeURIComponent(slug)}&l=${encodeURIComponent(lignes)}`;
  }, [q, slug, types]);
  const change = (id: string, delta: number) => setQ((avant) => ({ ...avant, [id]: Math.max(0, (avant[id] ?? 0) + delta) }));
  const dollars = usd(montant, taux, langue);

  return (
    <aside className="panneau pile panier" style={ecart(14)} aria-labelledby="t-billets">
      <h2 id="t-billets" className="titre-section">{textes.vosBillets}</h2>
      <div className="note note-info"><Icone nom="info" taille={20} epaisseur={2.2} />{remplir(textes.maxParPersonne, { max })}</div>
      <div className="pile" style={ecart(12)}>
        {types.map((c) => {
          const n = q[c.id] ?? 0;
          const epuise = c.restant === 0;
          const ferme = c.etat !== 'ouvert';
          const peu = !epuise && c.restant <= 20;
          const plafond = Math.min(c.restant, c.limiteParCommande ?? Infinity);
          const plusOff = epuise || ferme || total >= max || n >= plafond;
          const badge = epuise ? <span className="badge badge-neutre">{textes.epuise}</span>
            : c.etat === 'pasEncore' ? <span className="badge badge-neutre">{c.ouvertureTexte}</span>
            : c.etat === 'termine' ? <span className="badge badge-neutre">{textes.venteTerminee}</span>
            : peu ? <span className="badge badge-danger">{remplir(textes.plusQue, { n: c.restant })}</span>
            : <span className="badge badge-neutre">{textes.disponible}</span>;
          return (
            <div key={c.id} className={`categorie-billet${n ? ' choisie' : ''}${epuise || ferme ? ' epuisee' : ''}`}>
              <div className="rangee entre" style={{ alignItems: 'flex-start' }}>
                <div><h3>{c.nom}</h3>{c.description ? <span className="doux" style={{ fontSize: 'var(--t-petit)' }}>{c.description}</span> : null}</div>
                {badge}
              </div>
              <div className="rangee entre">
                <div className="prix"><b style={{ fontSize: 'var(--t-prix)' }}>{cdf(c.prixCdf, textes.gratuit, langue)}</b>{usd(c.prixCdf, taux, langue) ? <span className="doux" style={{ fontSize: 'var(--t-petit)' }}>{usd(c.prixCdf, taux, langue)}</span> : null}</div>
                <div className="compteur">
                  <button type="button" disabled={n === 0} aria-label={remplir(textes.retirer, { nom: c.nom })} onClick={() => change(c.id, -1)}><Icone nom="minus" taille={22} epaisseur={2.6} /></button>
                  <output aria-live="polite" aria-label={remplir(textes.quantite, { nom: c.nom })}>{n}</output>
                  <button type="button" className="plus" disabled={plusOff} aria-label={remplir(textes.ajouter, { nom: c.nom })} onClick={() => change(c.id, 1)}><Icone nom="plus" taille={22} epaisseur={2.6} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {total >= max ? <div className="note note-attention" role="status">{remplir(textes.limite, { max })}</div> : null}
      <div className="total rangee entre" aria-live="polite">
        <div className="prix">
          <span className="doux">{total === 0 ? textes.aucunChoisi : remplir(total > 1 ? textes.plusieursBillets : textes.unBillet, { n: total })}</span>
          <b style={{ fontSize: 'var(--t-montant)' }}>{cdf(montant, '0 CDF', langue)}</b>
          {dollars ? <span className="doux">{dollars}</span> : null}
        </div>
      </div>
      <a className="btn btn-principal btn-grand btn-plein" href={total ? lien : undefined} aria-disabled={total === 0} onClick={(e) => { if (total === 0) e.preventDefault(); }}>{textes.continuer}</a>
    </aside>
  );
}
