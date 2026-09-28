'use client';

import { useState, useTransition } from 'react';

export function ActionsReclamation({ valider, refuser }: { valider: () => Promise<{ ok: boolean; message: string }>; refuser: (motif: string) => Promise<{ ok: boolean; message: string }> }) {
  const [motif, setMotif] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  if (message) return <span className={`note ${message.ok ? 'note-succes' : 'note-attention'}`} role="status">{message.message}</span>;
  return (
    <div className="pile" style={{ ['--gap' as string]: '8px' }}>
      <button className="btn btn-principal" type="button" disabled={enCours} onClick={() => { if (confirm('Le montant exact est-il bien arrivé sur le compte marchand avec cette référence ?')) demarrer(async () => setMessage(await valider())); }}>Valider</button>
      <input className="champ-texte" placeholder="Motif du refus" value={motif} onChange={(e) => setMotif(e.target.value)} aria-label="Motif du refus" />
      <button className="btn" type="button" disabled={enCours} onClick={() => demarrer(async () => setMessage(await refuser(motif)))}>Refuser</button>
    </div>
  );
}
