'use client';

import { useState } from 'react';
import { operateurDuNumero, type InfoOperateur } from '@/lib/operateurs';
import { formaterChiffres } from '@/lib/telephone';

export function Drapeau() {
  return (
    <svg width="24" height="17" viewBox="0 0 22 16" aria-hidden="true">
      <rect width="22" height="16" rx="2" fill="#1E8FFF" />
      <path d="M0 14L18 0h4v2L4 16H0z" fill="#FFD21F" />
      <path d="M0 15L19.5 0H22v.6L2.8 16H0z" fill="#C8102E" />
      <path d="M4.5 2l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z" fill="#FFD21F" />
    </svg>
  );
}

/** Champ +243 de la maquette : saisie groupée « 97 123 45 67 », détection de l'opérateur facultative. */
export function ChampTelephone({ id, name = 'telephone', label, placeholder, erreur, defaut = '', detection, onChange, drapeau = true, autoFocus }: {
  id: string; name?: string; label: string; placeholder: string; erreur?: string; defaut?: string;
  detection?: { detecte: string; inconnu: string }; // detecte : « {operateur} détecté d'après le {prefixe} »
  onChange?: (chiffres: string, op: InfoOperateur | null) => void; drapeau?: boolean; autoFocus?: boolean;
}) {
  const [chiffres, setChiffres] = useState(defaut.replace(/\D/g, '').replace(/^243/, '').replace(/^0/, '').slice(0, 9));
  const op = operateurDuNumero(chiffres);
  const aide = `${id}-aide`;
  return (
    <div className="champ">
      <label htmlFor={id}>{label}</label>
      <div className="saisie">
        <span className="prefixe">{drapeau ? <Drapeau /> : null}+243</span>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder={placeholder}
          value={formaterChiffres(chiffres)}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={aide}
          autoFocus={autoFocus}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').replace(/^0/, '').slice(0, 9);
            setChiffres(d);
            onChange?.(d, operateurDuNumero(d));
          }}
        />
      </div>
      <div id={aide} className="rangee" style={{ minHeight: 24, fontSize: 15 }}>
        {erreur ? <span className="erreur-champ">{erreur}</span>
          : detection && op ? <><span style={{ width: 18, height: 18, borderRadius: 5, background: op.fond }} /><TexteDetection modele={detection.detecte} operateur={op.nom.split(' ')[0] ?? op.nom} prefixe={chiffres.slice(0, 2)} /></>
          : detection && chiffres.length >= 2 ? <span className="doux">{detection.inconnu}</span> : null}
      </div>
    </div>
  );
}

function TexteDetection({ modele, operateur, prefixe }: { modele: string; operateur: string; prefixe: string }) {
  const [avant, apres = ''] = modele.replace('{prefixe}', prefixe).split('{operateur}');
  return <span>{avant}<b>{operateur}</b>{apres}</span>;
}
