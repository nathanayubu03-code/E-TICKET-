'use client';

import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { Icone } from '@/components/ui/Icone';
import { COOKIE_LANGUE, LANGUES, NOMS_LANGUES, type Langue } from '@/i18n/config';

function ecrireCookie(nom: string, valeur: string) {
  document.cookie = `${nom}=${valeur}; path=/; max-age=31536000; samesite=lax`;
}

export function ChoixLangue({ langue, label }: { langue: Langue; label: string }) {
  const router = useRouter();
  return (
    <>
      <label className="sr" htmlFor="langue">{label}</label>
      <select
        id="langue"
        className="langue"
        defaultValue={langue}
        onChange={(e) => { ecrireCookie(COOKIE_LANGUE, e.target.value); router.refresh(); }}
      >
        {LANGUES.map((l) => <option key={l} value={l}>{NOMS_LANGUES[l]}</option>)}
      </select>
    </>
  );
}

const sombreSysteme = () => matchMedia('(prefers-color-scheme: dark)').matches;
function abonnerSysteme(rappel: () => void) {
  const m = matchMedia('(prefers-color-scheme: dark)');
  m.addEventListener('change', rappel);
  return () => m.removeEventListener('change', rappel);
}

export function BasculeTheme({ labelSombre, labelClair, theme }: { labelSombre: string; labelClair: string; theme?: 'light' | 'dark' }) {
  const systeme = useSyncExternalStore(abonnerSysteme, sombreSysteme, () => false);
  const [choix, setChoix] = useState<'light' | 'dark' | null>(null);
  const courant = choix ?? theme ?? null;
  const sombre = courant ? courant === 'dark' : systeme;
  return (
    <button
      className="icone-bouton"
      type="button"
      aria-label={sombre ? labelClair : labelSombre}
      onClick={() => {
        const suivant = sombre ? 'light' : 'dark';
        document.documentElement.dataset.theme = suivant;
        ecrireCookie('et-theme', suivant);
        setChoix(suivant);
      }}
    >
      <Icone nom={sombre ? 'sun' : 'moon'} taille={22} />
    </button>
  );
}

function abonnerReseau(rappel: () => void) {
  addEventListener('online', rappel);
  addEventListener('offline', rappel);
  return () => { removeEventListener('online', rappel); removeEventListener('offline', rappel); };
}

export function BandeauReseau({ texte }: { texte: string }) {
  const horsLigne = useSyncExternalStore(abonnerReseau, () => !navigator.onLine, () => false);
  if (!horsLigne) return null;
  return <div className="note note-attention" role="status" style={{ borderRadius: 0, justifyContent: 'center' }}>{texte}</div>;
}
