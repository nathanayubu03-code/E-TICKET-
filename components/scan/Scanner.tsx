'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icone } from '@/components/ui/Icone';
import { estIdentifiantBillet, lireContenuQR } from '@/lib/billets/contenu';
import { CELL, couchesInline, phaseA, signeDuMoment } from '@/lib/kuba';
import type { ResultatScan } from '@/lib/db';
import type { ScanHorsLigne } from '@/lib/scan';
import { ajouterEnAttente, ecrireManifeste, idScan, lireEnAttente, lireManifeste, retirerEnAttente, sha256Hex, type ManifesteLocal } from '@/lib/scan-client';
import { Camera } from './Camera';

export type TextesScanner = Record<'titre' | 'telechargement' | 'listeRequise' | 'enLigne' | 'horsLigne' | 'entrees' | 'signe' | 'placer' | 'verifierSigne' | 'lampe' | 'saisir' | 'saisirLabel' | 'valider' | 'motifAttendu' | 'motifTexte' | 'suivant' | 'valide' | 'refuse' | 'deja' | 'dejaTexte' | 'inconnu' | 'inconnuTexte' | 'refuseTexte' | 'camera' | 'porte' | 'reessayer', string>;

interface Resultat { type: ResultatScan; publicId?: string; categorie?: string; premier?: string; porte?: string | null }

const SYNCHRO_MS = 60_000;
const remplir = (m: string, v: Record<string, string | number>) => m.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));
const heureCourte = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function Scanner({ evenementId, porte, textes }: { evenementId: string; porte: string | null; textes: TextesScanner }) {
  const [m, setM] = useState<ManifesteLocal | null>(null);
  const [etatChargement, setEtatChargement] = useState<'chargement' | 'pret' | 'impossible'>('chargement');
  const [enLigne, setEnLigne] = useState(true);
  const [attente, setAttente] = useState(0);
  const [entreesLocales, setEntreesLocales] = useState(0);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [lampe, setLampe] = useState(false);
  const [saisie, setSaisie] = useState(false);
  const [cameraKo, setCameraKo] = useState(false);
  const [maintenant, setMaintenant] = useState(0);
  const deja = useRef(new Map<string, { premier: string; porte: string | null }>());
  const dernier = useRef<{ texte: string; t: number }>({ texte: '', t: 0 });
  const cameraIndisponible = useCallback(() => setCameraKo(true), []);

  const appliquerManifeste = useCallback((x: ManifesteLocal) => {
    deja.current = new Map(x.deja.map(([e, p, po]) => [e, { premier: p, porte: po }]));
    setM(x);
  }, []);

  /** Envoie les scans hors ligne, puis retélécharge la liste. */
  const synchroniser = useCallback(async (): Promise<boolean> => {
    try {
      const local = await lireManifeste(evenementId);
      const enAttente = await lireEnAttente(evenementId);
      if (enAttente.length && local) {
        const r = await fetch(`/api/scan/${evenementId}/synchroniser`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appareilId: local.appareilId, scans: enAttente }) });
        if (!r.ok) throw new Error('synchro');
        await retirerEnAttente(enAttente.map((s) => s.scanClientId));
      }
      const debut = Date.now();
      const r = await fetch(`/api/scan/${evenementId}/manifeste`, { cache: 'no-store', headers: local ? { 'x-appareil': local.appareilId } : {} });
      if (!r.ok) throw new Error('manifeste');
      const d = (await r.json()) as ManifesteLocal;
      const fin = Date.now();
      const x: ManifesteLocal = { ...d, decalageMs: d.heureServeur - Math.round((debut + fin) / 2), telechargeLe: fin };
      await ecrireManifeste(x);
      // Les scans validés hors ligne, pas encore renvoyés, restent « déjà scannés » sur cet appareil.
      const restants = await lireEnAttente(evenementId);
      for (const s of restants) if (s.resultatLocal === 'VALIDE' && s.empreinte) x.deja.push([s.empreinte, s.scanneLe, s.porte]);
      appliquerManifeste(x);
      setAttente(restants.length);
      setEntreesLocales(restants.filter((s) => s.resultatLocal === 'VALIDE').length);
      setEnLigne(true);
      return true;
    } catch {
      setEnLigne(false);
      return false;
    }
  }, [evenementId, appliquerManifeste]);

  // Démarrage : sans liste des billets (réseau ou copie locale), le scanner refuse de démarrer.
  useEffect(() => {
    let fini = false;
    (async () => {
      const local = await lireManifeste(evenementId);
      const enAttente = await lireEnAttente(evenementId).catch(() => []);
      if (local && !fini) {
        for (const s of enAttente) if (s.resultatLocal === 'VALIDE' && s.empreinte) local.deja.push([s.empreinte, s.scanneLe, s.porte]);
        appliquerManifeste(local);
        setAttente(enAttente.length);
        setEntreesLocales(enAttente.filter((s) => s.resultatLocal === 'VALIDE').length);
        setEtatChargement('pret');
      }
      const ok = navigator.onLine ? await synchroniser() : false;
      if (fini) return;
      if (!ok) setEnLigne(false);
      setEtatChargement(local || ok ? 'pret' : 'impossible');
    })();
    const minuterie = setInterval(() => { if (navigator.onLine) void synchroniser(); }, SYNCHRO_MS);
    const horloge = setInterval(() => setMaintenant(Date.now()), 1000);
    const passerHorsLigne = () => setEnLigne(false);
    const revenir = () => void synchroniser();
    addEventListener('offline', passerHorsLigne);
    addEventListener('online', revenir);
    return () => { fini = true; clearInterval(minuterie); clearInterval(horloge); removeEventListener('offline', passerHorsLigne); removeEventListener('online', revenir); };
  }, [evenementId, synchroniser, appliquerManifeste]);

  const montrer = (r: Resultat) => {
    setResultat(r);
    navigator.vibrate?.(r.type === 'VALIDE' ? 120 : [200, 100, 200]);
  };

  const traiter = useCallback(async (brutRecu: string, manuel = false) => {
    if (!m || resultat) return;
    const brut = brutRecu.trim().toUpperCase();
    // Anti-rebond : le même QR lu plusieurs fois de suite par la caméra ne compte qu'une fois.
    if (!manuel && brut === dernier.current.texte && Date.now() - dernier.current.t < 4000) return;
    dernier.current = { texte: brut, t: Date.now() };
    const scanneLe = new Date(Date.now() + m.decalageMs).toISOString();
    const scanClientId = idScan();
    const contenu = lireContenuQR(brut);
    let empreinte: string | null = null;
    if (contenu && contenu.evenement === m.evenement.code) empreinte = await sha256Hex(contenu.code);
    else if (estIdentifiantBillet(brut)) empreinte = m.billets.find((b) => b[1] === brut)?.[0] ?? null;
    const infoBillet = empreinte ? m.billets.find((b) => b[0] === empreinte) : undefined;
    const autreEvenement = !estIdentifiantBillet(brut) && (!contenu || contenu.evenement !== m.evenement.code);

    // En ligne : le serveur tranche (liste à jour de tous les appareils).
    if (navigator.onLine && enLigne) {
      try {
        const ctrl = new AbortController();
        const delai = setTimeout(() => ctrl.abort(), 4000);
        const r = await fetch(`/api/scan/${evenementId}/verifier`, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scanClientId, brut, appareilId: m.appareilId, porte, scanneLe }) });
        clearTimeout(delai);
        if (r.ok) {
          const d = (await r.json()) as { resultat: ResultatScan; publicId?: string; premierScanLe?: string; porte?: string | null };
          if (d.resultat === 'VALIDE' && empreinte) { deja.current.set(empreinte, { premier: scanneLe, porte }); setEntreesLocales((n) => n + 1); }
          const info = d.publicId ? m.billets.find((b) => b[1] === d.publicId) : infoBillet;
          montrer({ type: d.resultat, publicId: d.publicId, categorie: info?.[2], premier: d.premierScanLe, porte: d.porte });
          return;
        }
      } catch { setEnLigne(false); }
    }

    // Hors ligne : comparaison à la liste téléchargée.
    let type: ResultatScan;
    if (autreEvenement || (empreinte && m.annules.includes(empreinte))) type = 'REFUSE';
    else if (empreinte && deja.current.has(empreinte)) type = 'DEJA_SCANNE';
    else if (infoBillet) type = 'VALIDE';
    else type = 'INCONNU';
    const premier = empreinte ? deja.current.get(empreinte) : undefined;
    if (type === 'VALIDE' && empreinte) { deja.current.set(empreinte, { premier: scanneLe, porte }); setEntreesLocales((n) => n + 1); }
    const aEnvoyer: ScanHorsLigne = { scanClientId, empreinte, brut: brut.slice(0, 120), resultatLocal: type, scanneLe, porte };
    await ajouterEnAttente(evenementId, aEnvoyer);
    setAttente((n) => n + 1);
    montrer({ type, publicId: infoBillet?.[1], categorie: infoBillet?.[2], premier: premier?.premier, porte: premier?.porte });
  }, [m, resultat, enLigne, evenementId, porte]);

  if (etatChargement !== 'pret' || !m) {
    return (
      <div className="scan-ecran" style={{ justifyContent: 'center', padding: 24, gap: 16 }}>
        <h1 className="affiche" style={{ fontSize: 40 }}>{textes.titre}</h1>
        {etatChargement === 'chargement' ? <p role="status">{textes.telechargement}</p> : (
          <>
            <p className="note note-danger" role="alert">{textes.listeRequise}</p>
            <button className="btn btn-principal btn-grand" type="button" onClick={() => location.reload()}>{textes.reessayer}</button>
          </>
        )}
      </div>
    );
  }

  const phase = phaseA(maintenant, m.decalageMs);
  const signe = signeDuMoment(m.evenement.selAffichage, phase);
  const entrees = m.entrees + entreesLocales;

  return (
    <div className="scan-ecran">
      <header className="scan-barre">
        <div className="rangee entre">
          <div><b style={{ fontSize: 16 }}>{textes.titre}</b><div style={{ fontSize: 14, color: '#B9AE98' }}>{[porte ? `${textes.porte} ${porte}` : null, m.evenement.titre].filter(Boolean).join(' · ')}</div></div>
          <span role="status" className="badge" style={enLigne && attente === 0 ? { background: '#DDF3E4', color: '#0B6B37' } : { background: '#FFD21F', color: '#14120E' }}>
            {!enLigne ? <Icone nom="wifiOff" taille={14} epaisseur={2.6} /> : null}{enLigne && attente === 0 ? textes.enLigne : remplir(textes.horsLigne, { n: attente })}
          </span>
        </div>
        <div className="rangee entre">
          <div><b className="affiche" style={{ fontSize: 36 }}>{entrees.toLocaleString('fr-FR').replace(/[  ]/g, ' ')}</b> <span style={{ color: '#B9AE98' }}>{remplir(textes.entrees, { total: m.evenement.quota.toLocaleString('fr-FR').replace(/[  ]/g, ' ') })}</span></div>
          <div className="rangee" style={{ gap: 8, padding: '6px 10px', borderRadius: 12, background: '#2E2A21' }} aria-label={`${textes.signe} : ${signe.nom}`}>
            <span style={{ fontSize: 13, color: '#B9AE98' }}>{textes.signe}</span>
            <i style={{ width: 20, height: 20, display: 'inline-block', background: signe.couleur, border: '2px solid #FBF5E6', transform: signe.forme === 'losange' ? 'rotate(45deg)' : undefined }} />
          </div>
        </div>
      </header>

      <div className="scan-viseur">
        {cameraKo ? <p style={{ padding: 20 }}>{textes.camera}</p> : <Camera actif={!resultat && !saisie} onLecture={traiter} lampe={lampe} onErreur={cameraIndisponible} />}
        <div className="scan-cadre" /><div className="scan-ligne" />
      </div>

      <div className="pile" style={{ ['--gap' as string]: '10px', padding: 16 }}>
        <b style={{ fontSize: 18 }}>{textes.placer}</b>
        <span style={{ color: '#B9AE98' }}>{textes.verifierSigne} <b style={{ color: '#FBF5E6' }}>{signe.nom.toLowerCase()}</b>.</span>
        <div className="rangee" style={{ gap: 10 }}>
          <button className="btn" type="button" style={{ flex: 1 }} aria-pressed={lampe} onClick={() => setLampe(!lampe)}>{textes.lampe}</button>
          <button className="btn" type="button" style={{ flex: 1 }} onClick={() => setSaisie(true)}>{textes.saisir}</button>
        </div>
        {saisie ? (
          <form className="pile" style={{ ['--gap' as string]: '8px' }} onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('numero'); setSaisie(false); if (typeof v === 'string' && v) void traiter(v, true); }}>
            <label htmlFor="numero-billet">{textes.saisirLabel}</label>
            <input id="numero-billet" name="numero" className="champ-texte" autoCapitalize="characters" autoComplete="off" placeholder="ET-XXXX-XXXX" autoFocus />
            <button className="btn btn-principal" type="submit">{textes.valider}</button>
          </form>
        ) : null}
      </div>

      {resultat ? (
        <div className={`scan-resultat ${resultat.type === 'VALIDE' ? 'scan-valide' : resultat.type === 'REFUSE' ? 'scan-refuse' : 'scan-deja'}`} role="alert">
          <h1>{resultat.type === 'VALIDE' ? textes.valide : resultat.type === 'REFUSE' ? textes.refuse : resultat.type === 'DEJA_SCANNE' ? textes.deja : textes.inconnu}</h1>
          {resultat.type === 'VALIDE' ? (
            <>
              <p style={{ fontSize: 22, fontWeight: 700 }}>{resultat.categorie}</p>
              <p style={{ fontSize: 17 }}>{resultat.publicId}</p>
              {resultat.publicId ? (
                <div className="rangee" style={{ gap: 14, alignItems: 'center' }}>
                  <svg viewBox={`0 0 ${11 * CELL} ${11 * CELL}`} width="120" height="120" style={{ borderRadius: 10, flex: 'none' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: couchesInline(resultat.publicId, { cols: 11, rows: 11, trou: true, phase, souffle: true }) }} />
                  <p style={{ fontSize: 16 }}><b>{textes.motifAttendu}</b><br />{textes.motifTexte}</p>
                </div>
              ) : null}
            </>
          ) : resultat.type === 'DEJA_SCANNE' ? (
            <p style={{ fontSize: 20, fontWeight: 700 }}>{resultat.premier ? remplir(textes.dejaTexte, { heure: heureCourte(resultat.premier), porte: resultat.porte ? `${textes.porte} ${resultat.porte}` : '' }).replace(/, \.$/, '.') : resultat.publicId}</p>
          ) : resultat.type === 'INCONNU' ? (
            <p style={{ fontSize: 20, fontWeight: 700 }}>{textes.inconnuTexte}</p>
          ) : (
            <p style={{ fontSize: 20, fontWeight: 700 }}>{textes.refuseTexte}</p>
          )}
          <button className="btn btn-grand" type="button" style={{ marginTop: 12, background: '#FFFFFF', color: '#14120E', borderColor: '#14120E' }} onClick={() => setResultat(null)} autoFocus>{textes.suivant}</button>
        </div>
      ) : null}
    </div>
  );
}
