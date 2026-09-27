'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { payer } from '@/app/(public)/achat/actions';
import { Icone } from '@/components/ui/Icone';
import { operateurDuNumero, type InfoOperateur } from '@/lib/operateurs';
import { formaterChiffres } from '@/lib/telephone';
import { ecart } from '@/lib/style';
import type { TextesPaiement } from './cles-paiement';

export type { TextesPaiement };

type Vue = 'paiement' | 'attente' | 'recu' | 'echec' | 'delai';
const TOTAL_S = 120;
const RELANCE_S = 30;
const remplir = (m: string, v: Record<string, string | number>) => m.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

/** Rend un gabarit contenant des balises <b> (textes validés de la maquette). */
function Riche({ gabarit, v = {} }: { gabarit: string; v?: Record<string, string | number> }) {
  const morceaux = remplir(gabarit, v).split(/(<b>.*?<\/b>)/g);
  return <>{morceaux.map((m, i) => (m.startsWith('<b>') ? <b key={i}>{m.slice(3, -4)}</b> : <span key={i}>{m}</span>))}</>;
}


export function ParcoursPaiement({ code, total, montant, dollars, lignes, operateurs, chiffresInitiaux, vueInitiale, debutPaiement, operateurInitial, agentHref, textes }: {
  code: string; total: number; montant: string; dollars: string | null; lignes: { libelle: string; montant: string; gras?: boolean }[];
  operateurs: InfoOperateur[]; chiffresInitiaux: string; vueInitiale: 'paiement' | 'attente'; debutPaiement: number | null; operateurInitial: string | null;
  agentHref: string | null; textes: TextesPaiement;
}) {
  const router = useRouter();
  const detecte = operateurDuNumero(chiffresInitiaux);
  const [vue, setVue] = useState<Vue>(vueInitiale);
  const [op, setOp] = useState<InfoOperateur>(operateurs.find((o) => o.k === operateurInitial) ?? detecte ?? operateurs[0]!);
  const [chiffres, setChiffres] = useState(chiffresInitiaux);
  const [debut, setDebut] = useState<number | null>(debutPaiement);
  const [maintenant, setMaintenant] = useState<number>(() => debutPaiement ?? 0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const titre = useRef<HTMLHeadingElement>(null);

  // Horloge d'une seconde pour le compte à rebours.
  useEffect(() => {
    const m = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(m);
  }, []);
  const ecoule = debut ? Math.max(0, Math.floor((maintenant - debut) / 1000)) : 0;
  const reste = Math.max(0, TOTAL_S - ecoule);
  const relance = Math.max(0, RELANCE_S - ecoule);

  // Sondage de notre serveur toutes les 3 secondes (le serveur lit sa base, pas l'opérateur).
  const sonder = useCallback(async () => {
    try {
      const r = await fetch(`/api/commandes/${code}/statut`, { cache: 'no-store' });
      if (!r.ok) return;
      const d = (await r.json()) as { commande: string; paiement: string | null };
      if (d.commande === 'PAYEE' || d.commande === 'PAYEE_SANS_PLACE') {
        setVue('recu');
        setTimeout(() => router.refresh(), 2200);
      } else if (d.paiement === 'ECHOUE') setVue((v) => (v === 'attente' ? 'echec' : v));
      else if (d.paiement === 'EXPIRE') setVue((v) => (v === 'attente' ? 'delai' : v));
    } catch { /* réseau coupé : on réessaie au prochain tour */ }
  }, [code, router]);

  useEffect(() => {
    if (vue !== 'attente' && vue !== 'delai') return;
    const m = setInterval(sonder, 3000);
    return () => clearInterval(m);
  }, [vue, sonder]);

  useEffect(() => {
    if (vue === 'attente' && debut && reste === 0) {
      const m = setTimeout(() => setVue('delai'), 0);
      return () => clearTimeout(m);
    }
  }, [vue, debut, reste]);

  useEffect(() => { titre.current?.focus(); scrollTo({ top: 0, behavior: 'smooth' }); }, [vue]);

  const lancer = (nouvelle: boolean) => demarrer(async () => {
    setErreur(null);
    const r = await payer(code, op.k, chiffres, nouvelle);
    if (!r.ok) {
      setErreur(r.message);
      if (r.expire) router.refresh();
      return;
    }
    const t = Date.now();
    setDebut(t);
    setMaintenant(t);
    setVue('attente');
  });

  const nomOp = op.nom;
  const mmss = `${Math.floor(reste / 60)}:${String(reste % 60).padStart(2, '0')}`;

  if (vue === 'paiement') {
    return (
      <section className="panneau pile" style={ecart(18)} aria-labelledby="t-pay">
        <h1 id="t-pay" ref={titre} tabIndex={-1} className="affiche" style={{ fontSize: 'clamp(36px,6vw,52px)' }}>{textes.payerAvec}</h1>
        <div className="operateurs" role="group" aria-label={textes.operateurAria}>
          {operateurs.map((o) => (
            <button key={o.k} type="button" className="operateur" aria-pressed={o.k === op.k} style={{ background: o.fond, color: o.texte }} onClick={() => setOp(o)}>
              <span className="losanges" aria-hidden="true"><i style={{ background: o.texte }} /><i style={{ border: `2px solid ${o.texte}` }} /></span>
              <span><b>{o.nom}</b><br /><small>{operateurDuNumero(chiffres)?.k === o.k ? remplir(textes.detecte, { prefixe: chiffres.slice(0, 2) }) : o.prefixes.slice(0, 3).map((p) => p.slice(1)).join(' · ')}</small></span>
              <span className="coche"><Icone nom="check" taille={18} epaisseur={3} /></span>
            </button>
          ))}
        </div>
        <div className="champ">
          <label htmlFor="num-pay">{remplir(textes.numeroOperateur, { operateur: nomOp })}</label>
          <div className="saisie"><span className="prefixe">+243</span><input id="num-pay" type="tel" inputMode="numeric" value={formaterChiffres(chiffres)} onChange={(e) => setChiffres(e.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 9))} /></div>
          <span className="doux" style={{ fontSize: 14 }}>{textes.demandeArrive}</span>
        </div>
        <div className="pile" style={ecart(8, { padding: 18, border: '2px solid var(--encre)', borderRadius: 18, boxShadow: '3px 3px 0 var(--ombre)' })}>
          <span className="doux" style={{ fontWeight: 700 }}>{textes.montantExact}</span>
          <span className="montant">{montant}</span>
          {dollars ? <span className="doux">{dollars}</span> : null}
          <div className="lignes">
            {lignes.map((l, i) => <div key={i} style={l.gras ? { fontWeight: 700 } : undefined}><span>{l.libelle}</span><span>{l.montant}</span></div>)}
          </div>
        </div>
        <div className="rangee" style={{ alignItems: 'flex-start', gap: 10 }}><Icone nom="shieldOk" taille={22} /><span>{textes.securite} <b>{textes.securiteGras}</b></span></div>
        {erreur ? <p className="note note-danger" role="alert">{erreur}</p> : null}
        <button className="btn btn-principal btn-grand" type="button" disabled={enCours || chiffres.length !== 9} onClick={() => lancer(false)}>{remplir(textes.payer, { montant })}</button>
        {agentHref ? <Link className="lien-bouton" href={agentHref} style={{ alignSelf: 'center' }}>{textes.payerAgent}</Link> : null}
      </section>
    );
  }

  return (
    <section className="panneau pile" style={ecart(18)} aria-labelledby="t-att">
      {vue === 'attente' ? (
        <div className="pile" style={ecart(18)}>
          <div className="minuteur" role="timer" aria-label={textes.minuteurAria}>
            <svg viewBox="0 0 184 184" aria-hidden="true">
              <circle cx="92" cy="92" r="80" fill="none" stroke="var(--surface-2)" strokeWidth="14" />
              <circle cx="92" cy="92" r="80" fill="none" stroke="var(--focus)" strokeWidth="14" strokeLinecap="round" strokeDasharray="502.7" strokeDashoffset={502.7 * (1 - reste / TOTAL_S)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="temps"><b>{mmss}</b><span className="doux">{textes.pourValider}</span></div>
          </div>
          <h1 id="t-att" ref={titre} tabIndex={-1} className="affiche" style={{ fontSize: 'clamp(36px,6vw,50px)', textAlign: 'center' }}>{textes.attenteTitre}</h1>
          <div className="pile" style={ecart(8)}>
            <span className="doux" style={{ fontWeight: 700 }}>{textes.messageVa}</span>
            <div className="bulle-ussd">{nomOp}<br />{remplir(textes.bulleLigne1, { montant: total })}<br />{textes.bulleLigne2}<br /><u>&nbsp;</u></div>
          </div>
          <ol className="liste-num">
            {[textes.attente1, textes.attente2, textes.attente3].map((g, i) => <li key={i}><span>{i + 1}</span><span><Riche gabarit={g!} v={{ operateur: nomOp, montant }} /></span></li>)}
          </ol>
        </div>
      ) : vue === 'recu' ? (
        <div className="pile" style={ecart(16, { textAlign: 'center' })} role="status">
          <span className="rond-etat" style={{ background: 'var(--succes-plein)', color: 'var(--sur-succes)' }}><Icone nom="check" taille={64} epaisseur={3} /></span>
          <h1 ref={titre} tabIndex={-1} className="affiche" style={{ fontSize: 44 }}>{textes.recuTitre}</h1>
          <p style={{ fontSize: 18 }}><Riche gabarit={textes.recuTexte} v={{ operateur: nomOp, montant }} /></p>
          <div className="barre-indet"><i /></div>
          <p className="doux">{textes.nePasFermer}</p>
        </div>
      ) : vue === 'echec' ? (
        <div className="pile" style={ecart(16, { textAlign: 'center' })} role="alert">
          <span className="rond-etat" style={{ background: '#C8102E', color: '#FFFFFF' }}><Icone nom="x" taille={64} epaisseur={3} /></span>
          <h1 ref={titre} tabIndex={-1} className="affiche" style={{ fontSize: 44 }}>{textes.echecTitre}</h1>
          <p style={{ fontSize: 18 }}>{remplir(textes.echecTexte, { operateur: nomOp })}</p>
          <p className="note" style={{ background: 'var(--succes-doux)', color: 'var(--succes)', justifyContent: 'center' }}>{textes.aucunDebit}</p>
        </div>
      ) : (
        <div className="pile" style={ecart(16, { textAlign: 'center' })} role="alert">
          <span className="rond-etat" style={{ background: '#FFD21F', color: '#14120E', border: '3px solid #14120E' }}><Icone nom="clock" taille={64} epaisseur={3} /></span>
          <h1 ref={titre} tabIndex={-1} className="affiche" style={{ fontSize: 44 }}>{textes.delaiTitre}</h1>
          <p style={{ fontSize: 18 }}>{textes.delaiTexte}</p>
          <p style={{ padding: 14, borderRadius: 14, background: 'var(--attention-doux)', textAlign: 'left', lineHeight: 1.5 }}><Riche gabarit={textes.delaiAide} /></p>
        </div>
      )}

      {vue !== 'recu' ? (
        <div className="alerte-secret" role="note">
          <Icone nom="shield" taille={32} epaisseur={2.2} />
          <div className="pile" style={ecart(4)}><b style={{ fontSize: 18 }}>{textes.secretTitre}</b><span>{remplir(textes.secretTexte, { operateur: nomOp })}</span></div>
        </div>
      ) : null}

      {vue === 'attente' ? (
        <details className="aide" open>
          <summary>{textes.rienRecu}</summary>
          <ul>
            <li>{textes.aide1}</li>
            <li><Riche gabarit={op.ussd ? textes.aide2Ussd : textes.aide2} v={{ operateur: nomOp, ussd: op.ussd }} /></li>
            <li><Riche gabarit={textes.aide3} v={{ montant }} /></li>
          </ul>
        </details>
      ) : null}

      {erreur ? <p className="note note-danger" role="alert">{erreur}</p> : null}

      <div className="pile" style={ecart(10)}>
        {vue === 'attente' ? (
          <>
            <button className="btn btn-grand" type="button" disabled={relance > 0 || enCours} onClick={() => lancer(true)}>{relance > 0 ? remplir(textes.renvoyerDemandeDans, { temps: `0:${String(relance).padStart(2, '0')}` }) : textes.renvoyerDemande}</button>
            <button className="lien-bouton" type="button" style={{ alignSelf: 'center' }} onClick={() => setVue('paiement')}>{textes.changerMoyen}</button>
          </>
        ) : vue === 'echec' ? (
          <>
            <button className="btn btn-principal btn-grand" type="button" disabled={enCours} onClick={() => lancer(true)}>{textes.reessayer}</button>
            <button className="btn btn-grand" type="button" onClick={() => setVue('paiement')}>{textes.autreOperateur}</button>
          </>
        ) : vue === 'delai' ? (
          <>
            <button className="btn btn-principal btn-grand" type="button" disabled={enCours} onClick={() => lancer(true)}>{textes.relancer}</button>
            <button className="btn btn-grand" type="button" onClick={() => void sonder()}>{textes.verifier}</button>
          </>
        ) : null}
      </div>

      {vue !== 'recu' && agentHref ? (
        <Link id="agent" className="agent" href={agentHref}>
          <Icone nom="user" taille={26} />
          <span style={{ flex: 1 }}><b style={{ fontSize: 17, display: 'block' }}>{textes.agentTitre}</b><span className="doux"><Riche gabarit={textes.agentTexte} v={{ code }} /></span></span>
        </Link>
      ) : null}
    </section>
  );
}
