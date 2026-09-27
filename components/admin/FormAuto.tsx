'use client';

import { createContext, useActionState, useContext, useEffect, useRef, useState, useTransition } from 'react';
import { heureLocale } from './heure';

export interface EtatAction { ok: boolean; message?: string; erreurs?: Record<string, string>; sauveLe?: string }

/**
 * Formulaire à sauvegarde automatique : enregistre 1,5 s après la dernière modification,
 * et immédiatement au clic sur « Enregistrer ». Les erreurs de validation s'affichent par champ.
 */
export function FormAuto({ action, children, auto = true, libelle = 'Enregistrer', className = 'pile', multipart = false }: {
  action: (e: EtatAction, f: FormData) => Promise<EtatAction>; children: React.ReactNode; auto?: boolean; libelle?: string; className?: string; multipart?: boolean;
}) {
  const [etat, envoyer, enCours] = useActionState<EtatAction, FormData>(action, { ok: true });
  const [, demarrer] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modifie, setModifie] = useState(false);

  useEffect(() => () => { if (minuterie.current) clearTimeout(minuterie.current); }, []);

  const planifier = () => {
    setModifie(true);
    if (!auto) return;
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => {
      if (ref.current) { const fd = new FormData(ref.current); demarrer(() => { envoyer(fd); setModifie(false); }); }
    }, 1500);
  };

  return (
    <form ref={ref} action={(fd) => { setModifie(false); envoyer(fd); }} onChange={planifier} className={className} style={{ ['--gap' as string]: '16px' }} encType={multipart ? 'multipart/form-data' : undefined} noValidate>
      <FormErreurs.Provider value={etat.erreurs ?? {}}>{children}</FormErreurs.Provider>
      {etat.message ? <p className={`note ${etat.ok ? 'note-succes' : 'note-danger'}`} role="status">{etat.message}</p> : null}
      <div className="rangee envelopper">
        <button className="btn btn-principal" type="submit" disabled={enCours}>{libelle}</button>
        <span className="doux" aria-live="polite" style={{ fontSize: 14 }}>
          {enCours ? 'Enregistrement…' : modifie && auto ? 'Modifications en attente…' : etat.sauveLe ? `Brouillon enregistré à ${heureLocale(etat.sauveLe)}` : !etat.ok ? 'Non enregistré : corrigez les champs signalés.' : ''}
        </span>
      </div>
    </form>
  );
}

export const FormErreurs = createContext<Record<string, string>>({});

/** Champ étiqueté avec son erreur. */
export function Champ({ nom, id, label, aide, children }: { nom: string; id?: string; label: string; aide?: string; children: React.ReactNode }) {
  const erreur = useContext(FormErreurs)[nom];
  return (
    <div className="champ">
      <label htmlFor={id ?? nom}>{label}</label>
      {children}
      {erreur ? <span className="erreur-champ" role="alert">{erreur}</span> : aide ? <span className="aide-champ">{aide}</span> : null}
    </div>
  );
}
