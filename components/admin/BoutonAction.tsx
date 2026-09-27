'use client';

import { useState, useTransition } from 'react';

/** Bouton qui appelle une action serveur, avec confirmation facultative, et affiche le résultat. */
export function BoutonAction({ action, libelle, confirmation, classe = 'btn', danger = false }: {
  action: () => Promise<{ ok: boolean; message?: string } | void>; libelle: string; confirmation?: string; classe?: string; danger?: boolean;
}) {
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  return (
    <span className="pile" style={{ ['--gap' as string]: '6px' }}>
      <button
        type="button"
        className={`${classe}${danger ? ' btn-danger' : ''}`}
        disabled={enCours}
        onClick={() => {
          if (confirmation && !window.confirm(confirmation)) return;
          demarrer(async () => {
            const r = await action();
            if (r && r.message) setMessage({ ok: r.ok, texte: r.message });
          });
        }}
      >{libelle}</button>
      {message ? <span className={`note ${message.ok ? 'note-succes' : 'note-danger'}`} role="status">{message.texte}</span> : null}
    </span>
  );
}
