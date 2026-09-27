'use client';

import { useEffect, useState } from 'react';
import { Icone } from '@/components/ui/Icone';
import { CELL, couchesInline, phaseA, signeDuMoment } from '@/lib/kuba';
import type { QRDessin } from '@/lib/billets/qr';

export interface DonneesBillet {
  publicId: string;
  categorie: string;
  titulaire?: string | null;
  entree?: string | null;
  prix: string;
  decalageMs?: number;
}

export interface DonneesEvenementBillet {
  titre: string;
  sousTitre?: string | null;
  quand: string;
  lieu: string;
  selAffichage: string;
}

export interface TextesBillet {
  aria: string;
  unePersonne: string;
  jaugeAria: string;
  changeDans: string;
  titulaire: string;
  entree: string;
  numero: string;
  prixPaye: string;
  horsLigne: string;
  qrAria: string;
}

const COLS = 11;

/** Billet vivant, rendu identique à monterBillet() de la maquette. */
export function BilletVivant({ billet, evenement, qr, textes, arrive = false, horsLigne = true, etat }: {
  billet: DonneesBillet; evenement: DonneesEvenementBillet; qr: QRDessin | null; textes: TextesBillet; arrive?: boolean; horsLigne?: boolean; etat?: string;
}) {
  const [maintenant, setMaintenant] = useState<number | null>(null);
  useEffect(() => {
    const tic = () => setMaintenant(Date.now() + (billet.decalageMs ?? 0));
    const premier = setTimeout(tic, 0);
    const minuterie = setInterval(tic, 1000);
    return () => { clearTimeout(premier); clearInterval(minuterie); };
  }, [billet.decalageMs]);

  const instant = maintenant ?? 0;
  const phase = maintenant === null ? 0 : phaseA(instant);
  const ecoule = maintenant === null ? 0 : Math.floor(instant / 1000) % 30;
  const signe = signeDuMoment(evenement.selAffichage, phase);
  const w = COLS * CELL;
  const couches = couchesInline(billet.publicId, { cols: COLS, rows: COLS, trou: true, phase, souffle: true });

  return (
    <article className={`billet${arrive ? ' arrive' : ''}`} aria-label={textes.aria}>
      <div className="tete">
        <div className="rangee entre">
          <span className="affiche" style={{ fontSize: 20 }}>e-Ticket</span>
          <span className="badge" style={{ background: '#FFD21F', color: '#14120E' }}>{textes.unePersonne}</span>
        </div>
        <div className="affiche">{evenement.titre}</div>
        {evenement.sousTitre ? <div style={{ fontWeight: 700 }}>{evenement.sousTitre}</div> : null}
        <div style={{ fontSize: 14 }}>{evenement.quand}<br />{evenement.lieu}</div>
      </div>
      <div className="decoupe"><i /></div>
      <div className="motif">
        <svg viewBox={`0 0 ${w} ${w}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={textes.qrAria}>
          <g dangerouslySetInnerHTML={{ __html: couches }} />
          {qr ? (
            <>
              <rect x={qr.x} y={qr.y} width={qr.taille} height={qr.taille} fill="#FFFFFF" />
              <path d={qr.chemin} fill="#000000" shapeRendering="crispEdges" />
            </>
          ) : null}
        </svg>
      </div>
      {etat ? <div className="note note-danger" style={{ margin: '14px 20px 0' }}>{etat}</div> : null}
      <div className="phase">
        <div className="jauge" role="progressbar" aria-label={textes.jaugeAria} aria-valuemin={0} aria-valuemax={30} aria-valuenow={ecoule}>
          <i style={{ width: `${Math.round(((ecoule + 1) / 30) * 100)}%` }} />
        </div>
        <div className="rangee entre">
          <span className="doux">{textes.changeDans} <b style={{ color: 'var(--encre)' }}>{30 - ecoule} s</b></span>
          <span className="signe">
            <i style={{ background: signe.couleur, transform: `rotate(${signe.forme === 'losange' ? 45 : 0}deg)` }} />
            {signe.nom}
          </span>
        </div>
      </div>
      <div className="details">
        {billet.titulaire ? <div><span className="doux">{textes.titulaire}</span><b>{billet.titulaire}</b></div> : null}
        {billet.entree ? <div><span className="doux">{textes.entree}</span><b>{billet.entree}</b></div> : null}
        <div><span className="doux">{textes.numero}</span><b>{billet.publicId}</b></div>
        <div><span className="doux">{textes.prixPaye}</span><b>{billet.prix}</b></div>
      </div>
      {horsLigne ? (
        <div className="note note-info horsligne"><Icone nom="download" taille={20} epaisseur={2.2} />{textes.horsLigne}</div>
      ) : <div style={{ height: 20 }} />}
    </article>
  );
}
