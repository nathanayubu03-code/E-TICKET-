'use client';

import { useState } from 'react';
import { Champ } from './FormAuto';

interface Ville { id: string; nom: string; fuseau: string; lieux: { id: string; nom: string; adresse: string | null; latitude: string | null; longitude: string | null }[] }

const LIBELLE_FUSEAU: Record<string, string> = { 'Africa/Kinshasa': 'UTC+1, heure de Kinshasa', 'Africa/Lubumbashi': 'UTC+2, heure de Lubumbashi' };

export function ChoixLieu({ villes, villeId, lieuId }: { villes: Ville[]; villeId: string; lieuId: string }) {
  const [ville, setVille] = useState(villeId);
  const [lieu, setLieu] = useState(lieuId || (villes.find((v) => v.id === villeId)?.lieux.length ? '' : 'nouveau'));
  const v = villes.find((x) => x.id === ville);
  const l = v?.lieux.find((x) => x.id === lieu);
  return (
    <>
      <Champ nom="villeId" label="Ville" aide={v ? `Les heures se saisissent dans le fuseau de la ville (${LIBELLE_FUSEAU[v.fuseau] ?? v.fuseau}).` : undefined}>
        <select id="villeId" name="villeId" className="champ-select" value={ville} onChange={(e) => { setVille(e.target.value); setLieu(''); }}>
          <option value="">Choisir</option>
          {villes.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
        </select>
      </Champ>
      {v ? (
        <Champ nom="lieuId" label="Lieu">
          <select id="lieuId" name="lieuId" className="champ-select" value={lieu} onChange={(e) => setLieu(e.target.value)}>
            <option value="">Choisir</option>
            {v.lieux.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
            <option value="nouveau">Nouveau lieu…</option>
          </select>
        </Champ>
      ) : null}
      {v && lieu === 'nouveau' ? <Champ nom="lieuNom" label="Nom du nouveau lieu"><input id="lieuNom" name="lieuNom" className="champ-texte" maxLength={140} /></Champ> : null}
      {v && lieu ? (
        <div className="grid gap-4 sm:grid-cols-3" key={lieu}>
          <Champ nom="lieuAdresse" label="Adresse (facultatif)"><input id="lieuAdresse" name="lieuAdresse" className="champ-texte" defaultValue={l?.adresse ?? ''} maxLength={240} /></Champ>
          <Champ nom="latitude" label="Latitude GPS (facultatif)"><input id="latitude" name="latitude" className="champ-texte" inputMode="decimal" defaultValue={l?.latitude ?? ''} /></Champ>
          <Champ nom="longitude" label="Longitude GPS (facultatif)"><input id="longitude" name="longitude" className="champ-texte" inputMode="decimal" defaultValue={l?.longitude ?? ''} /></Champ>
        </div>
      ) : null}
    </>
  );
}
