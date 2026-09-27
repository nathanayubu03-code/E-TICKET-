'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Icone } from '@/components/ui/Icone';
import type { BilletHorsLigne } from '@/lib/billets/hors-ligne';
import { enregistrerBillets, lireBillets, type BilletEnregistre } from '@/lib/billets/stockage-local';
import { motifSVGInline } from '@/lib/kuba';
import { ecart } from '@/lib/style';
import { BilletVivant, type TextesBillet } from './BilletVivant';

export interface TextesMesBillets {
  titre: string; horsLigneTitre: string; horsLigneTexte: string; periode: string; aVenir: string; passes: string; surTelephone: string; aTelecharger: string;
  unBillet: string; conseil: string; billetOuvert: string; videTitre: string; videTexte: string; voirEvenements: string; connecter: string; seConnecter: string; enregistrer: string;
  billet: Omit<TextesBillet, 'aria' | 'unePersonne' | 'qrAria'> & { aria: string; unePersonne: string; qrAria: string };
}

const remplir = (m: string, v: Record<string, string | number>) => m.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

export function MesBillets({ serveur, passes, connecte, textes }: { serveur: BilletHorsLigne[] | null; passes: { titre: string; info: string }[]; connecte: boolean; textes: TextesMesBillets }) {
  const [locaux, setLocaux] = useState<BilletEnregistre[] | null>(null);
  const [onglet, setOnglet] = useState<'avenir' | 'passes'>('avenir');
  const [choisi, setChoisi] = useState<string | null>(null);

  // Lecture des billets du téléphone (les billets d'événements passés ou annulés sont écartés),
  // puis enregistrement du premier billet affiché s'il n'y est pas encore.
  useEffect(() => {
    void (async () => {
      const maintenant = Date.now();
      const actifs = (tous: BilletEnregistre[]) => tous.filter((b) => b.statut === 'VALIDE' && (!b.evenement.debutLe || new Date(b.evenement.debutLe).getTime() + 6 * 3600_000 > maintenant));
      let tous = await lireBillets();
      const premier = serveur?.[0];
      if (premier && !tous.some((b) => b.publicId === premier.publicId)) {
        await enregistrerBillets([premier]);
        tous = await lireBillets();
      }
      setLocaux(actifs(tous));
    })();
  }, [serveur]);

  // Billets à venir : ceux du serveur (à jour) complétés par ceux du téléphone (hors ligne, ou pas connecté).
  const avenir = useMemo(() => {
    const parId = new Map<string, BilletHorsLigne & { decalageMs?: number }>();
    for (const b of locaux ?? []) parId.set(b.publicId, b);
    for (const b of serveur ?? []) parId.set(b.publicId, { ...b, decalageMs: locaux?.find((l) => l.publicId === b.publicId)?.decalageMs });
    if (serveur) for (const id of [...parId.keys()]) if (!serveur.some((b) => b.publicId === id) && connecte) parId.delete(id);
    return [...parId.values()].sort((a, b) => (a.evenement.debutLe ?? '').localeCompare(b.evenement.debutLe ?? ''));
  }, [serveur, locaux, connecte]);

  const surTelephone = new Set((locaux ?? []).map((b) => b.publicId));
  const ouvert = avenir.find((b) => b.publicId === choisi) ?? avenir[0];

  const enregistrer = async (b: BilletHorsLigne) => {
    await enregistrerBillets([b]);
    setLocaux(await lireBillets());
  };

  if (locaux === null && !serveur) return <div className="panneau"><p className="doux">…</p></div>;

  if (avenir.length === 0 && passes.length === 0) {
    return (
      <section className="panneau pile" style={ecart(14, { alignItems: 'center', textAlign: 'center', maxWidth: 640, marginInline: 'auto' })}>
        <h1 className="affiche" style={{ fontSize: 'clamp(40px,6vw,60px)' }}>{textes.titre}</h1>
        <h2 className="titre-section">{textes.videTitre}</h2>
        <p className="doux">{connecte ? textes.videTexte : textes.connecter}</p>
        <div className="rangee envelopper" style={{ justifyContent: 'center' }}>
          {!connecte ? <Link className="btn btn-principal" href="/connexion?suite=/mes-billets">{textes.seConnecter}</Link> : null}
          <Link className={connecte ? 'btn btn-principal' : 'btn'} href="/">{textes.voirEvenements}</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="mb-grille">
      <section className="panneau pile" style={ecart(16)} aria-labelledby="t-mb">
        <h1 id="t-mb" className="affiche" style={{ fontSize: 'clamp(40px,6vw,60px)' }}>{textes.titre}</h1>
        <div className="note note-info"><Icone nom="download" taille={20} epaisseur={2.2} /><span><b>{textes.horsLigneTitre}</b> {textes.horsLigneTexte}</span></div>
        <div className="onglets" role="tablist" aria-label={textes.periode}>
          <button role="tab" aria-selected={onglet === 'avenir'} type="button" onClick={() => setOnglet('avenir')}>{remplir(textes.aVenir, { n: avenir.length })}</button>
          <button role="tab" aria-selected={onglet === 'passes'} type="button" onClick={() => setOnglet('passes')}>{remplir(textes.passes, { n: passes.length })}</button>
        </div>
        <div className="pile" style={ecart(12)} role="tabpanel">
          {onglet === 'passes' ? passes.map((p, i) => (
            <div key={i} className="rangee" style={{ padding: 14, borderRadius: 14, background: 'var(--surface-2)' }}><Icone nom="check" taille={22} /><div><b>{p.titre}</b><div className="doux">{p.info}</div></div></div>
          )) : avenir.map((b) => (
            <button key={b.publicId} className="ligne-billet" type="button" aria-pressed={b.publicId === ouvert?.publicId} onClick={() => { setChoisi(b.publicId); if (!surTelephone.has(b.publicId) && serveur) void enregistrer(b); }}>
              <span className="mini" dangerouslySetInnerHTML={{ __html: motifSVGInline(b.publicId, { cols: 4, rows: 6, trou: false }) }} />
              <span className="pile" style={ecart(4, { flex: 1, minWidth: 0 })}>
                <b className="affiche" style={{ fontSize: 24, fontStretch: '80%' }}>{b.evenement.titre}</b>
                <span className="doux" style={{ fontSize: 14 }}>{b.evenement.quand} · {b.evenement.lieu}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{remplir(textes.unBillet, { categorie: b.categorie })}</span>
                <span>{surTelephone.has(b.publicId)
                  ? <span className="badge badge-info"><Icone nom="check" taille={14} epaisseur={3} />{textes.surTelephone}</span>
                  : <span className="badge badge-attention"><Icone nom="download" taille={14} epaisseur={3} />{textes.aTelecharger}</span>}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
      <aside className="pile" style={ecart(12, { position: 'sticky', top: 92 })} aria-label={textes.billetOuvert}>
        {ouvert ? (
          <BilletVivant
            billet={{ publicId: ouvert.publicId, categorie: ouvert.categorie, titulaire: ouvert.titulaire, entree: ouvert.entree, prix: ouvert.prix, decalageMs: ouvert.decalageMs ?? 0 }}
            evenement={ouvert.evenement}
            qr={ouvert.qr}
            horsLigne={surTelephone.has(ouvert.publicId)}
            textes={{ ...textes.billet, aria: remplir(textes.billet.aria, { titre: ouvert.evenement.titre, categorie: ouvert.categorie }), unePersonne: remplir(textes.billet.unePersonne, { categorie: ouvert.categorie }), qrAria: remplir(textes.billet.qrAria, { id: ouvert.publicId }) }}
          />
        ) : null}
        {ouvert && !surTelephone.has(ouvert.publicId) ? <button className="btn btn-grand" type="button" onClick={() => void enregistrer(ouvert)}>{textes.enregistrer}</button> : null}
        <p className="panneau doux" style={{ padding: '14px 16px', fontSize: 15, boxShadow: 'none' }}>{textes.conseil}</p>
      </aside>
    </div>
  );
}
