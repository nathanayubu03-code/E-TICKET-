'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { demanderCode, validerCode } from '@/app/(public)/connexion/actions';
import { ChampTelephone } from '@/components/ui/ChampTelephone';
import { formaterChiffres } from '@/lib/telephone';
import { ecart } from '@/lib/style';

export interface TextesConnexion {
  label: string; placeholder: string; detecte: string; inconnu: string; recevoirCode: string; codeEnvoye: string; modifier: string; codeTest: string;
  codeLegend: string; chiffre: string; autoRemplissage: string; rienRecu: string; renvoyerDans: string; renvoyer: string; validerCode: string;
}

const remplir = (m: string, v: Record<string, string | number>) => m.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ''));

/** Étape « numéro + code SMS » de la maquette (achat.html, étape 1). */
export function ConnexionOtp({ textes, telephoneInitial = '', onConnecte }: { textes: TextesConnexion; telephoneInitial?: string; onConnecte: () => void }) {
  const [chiffres, setChiffres] = useState(telephoneInitial.replace(/\D/g, '').replace(/^243/, '').slice(0, 9));
  const [codeEnvoye, setCodeEnvoye] = useState(false);
  const [cases, setCases] = useState<string[]>(['', '', '', '', '', '']);
  const [reste, setReste] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [codeTest, setCodeTest] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const piege = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (reste <= 0) return;
    const m = setTimeout(() => setReste((r) => r - 1), 1000);
    return () => clearTimeout(m);
  }, [reste]);

  const envoyer = () => demarrer(async () => {
    setErreur(null);
    const r = await demanderCode(chiffres, piege.current?.value ?? '');
    if (!r.ok) { setErreur(r.message); if (r.renvoiDans) setReste(r.renvoiDans); return; }
    setCodeEnvoye(true);
    setCodeTest(r.codeTest ?? null);
    setReste(r.renvoiDans);
    setTimeout(() => refs.current[0]?.focus(), 50);
  });

  const valider = (code: string) => demarrer(async () => {
    setErreur(null);
    const r = await validerCode(chiffres, code);
    if (r.ok) { onConnecte(); return; }
    setErreur(r.message);
    setCases(['', '', '', '', '', '']);
    if (r.recommencer) setCodeEnvoye(false); else refs.current[0]?.focus();
  });

  const saisir = (i: number, valeur: string) => {
    const v = valeur.replace(/\D/g, '');
    const suivant = [...cases];
    if (v.length > 1) {
      v.slice(0, 6 - i).split('').forEach((d, j) => { suivant[i + j] = d; });
      refs.current[Math.min(5, i + v.length - 1)]?.focus();
    } else {
      suivant[i] = v;
      if (v && i < 5) refs.current[i + 1]?.focus();
    }
    setCases(suivant);
    if (suivant.every(Boolean)) valider(suivant.join(''));
  };

  const complet = cases.every(Boolean);
  return (
    <div className="pile" style={ecart(18)}>
      <div className="piege" aria-hidden="true"><input ref={piege} tabIndex={-1} autoComplete="off" name="site_web" /></div>
      <ChampTelephone id="tel" label={textes.label} placeholder={textes.placeholder} defaut={chiffres} detection={{ detecte: textes.detecte, inconnu: textes.inconnu }} onChange={(d) => { setChiffres(d); if (codeEnvoye) setCodeEnvoye(false); }} />
      {!codeEnvoye ? (
        <button className="btn btn-principal btn-grand" type="button" disabled={chiffres.length !== 9 || enCours} onClick={envoyer}>{textes.recevoirCode}</button>
      ) : (
        <div className="pile" style={ecart(12, { borderTop: '2px dashed var(--trait)', paddingTop: 18 })}>
          <div className="rangee entre envelopper">
            <span>{textes.codeEnvoye} <b>+243 {formaterChiffres(chiffres)}</b></span>
            <button className="lien-bouton" type="button" onClick={() => setCodeEnvoye(false)}>{textes.modifier}</button>
          </div>
          <fieldset className="otp">
            <legend className="sr">{textes.codeLegend}</legend>
            {cases.map((c, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                aria-label={remplir(textes.chiffre, { n: i + 1 })}
                className={c ? 'rempli' : undefined}
                value={c}
                onChange={(e) => saisir(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Backspace' && !c && i > 0) refs.current[i - 1]?.focus(); }}
              />
            ))}
          </fieldset>
          {codeTest ? <p className="code-test" role="status">{remplir(textes.codeTest, { code: '' })}<b>{codeTest}</b></p> : null}
          <p className="doux" style={{ fontSize: 'var(--t-petit)' }}>{textes.autoRemplissage}</p>
          <div className="rangee entre">
            <span className="doux">{textes.rienRecu}</span>
            <button className="lien-bouton" type="button" disabled={reste > 0 || enCours} onClick={envoyer}>
              {reste > 0 ? remplir(textes.renvoyerDans, { temps: `0:${String(reste).padStart(2, '0')}` }) : textes.renvoyer}
            </button>
          </div>
          <button className="btn btn-principal btn-grand" type="button" disabled={!complet || enCours} onClick={() => valider(cases.join(''))}>{textes.validerCode}</button>
        </div>
      )}
      {erreur ? <p className="note note-danger" role="alert">{erreur}</p> : null}
    </div>
  );
}
