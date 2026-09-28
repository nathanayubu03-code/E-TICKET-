import { Champ } from './FormAuto';

export interface ValeursType { nom: string; description: string; prixCdf: number | ''; prixUsd: string; quota: number | ''; venteDebut: string; venteFin: string; limiteParCommande: number | ''; ordre: number }

export function ChampsTypeBillet({ v, suffixe, vendus }: { v: ValeursType; suffixe: string; vendus?: number }) {
  const id = (n: string) => `${n}-${suffixe}`;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <Champ nom="nom" id={id('nom')} label="Nom"><input id={id('nom')} name="nom" className="champ-texte" defaultValue={v.nom} maxLength={80} /></Champ>
        <Champ nom="prixCdf" id={id('prixCdf')} label="Prix en CDF" aide="Obligatoire. 0 pour gratuit."><input id={id('prixCdf')} name="prixCdf" type="number" min={0} step={1} className="champ-texte" defaultValue={v.prixCdf} /></Champ>
        <Champ nom="prixUsd" id={id('prixUsd')} label="Prix en USD (facultatif)" aide="Exemple : 10 ou 10,50. Vide : paiement en CDF seulement. Aucune conversion automatique."><input id={id('prixUsd')} name="prixUsd" inputMode="decimal" className="champ-texte" defaultValue={v.prixUsd} maxLength={12} /></Champ>
        <Champ nom="quota" id={id('quota')} label="Quota" aide={vendus !== undefined ? `${vendus} vendue${vendus > 1 ? 's' : ''} ou réservée${vendus > 1 ? 's' : ''}` : undefined}><input id={id('quota')} name="quota" type="number" min={1} step={1} className="champ-texte" defaultValue={v.quota} /></Champ>
      </div>
      <Champ nom="description" id={id('description')} label="Description (facultatif)"><input id={id('description')} name="description" className="champ-texte" defaultValue={v.description} maxLength={200} /></Champ>
      <div className="grid gap-4 sm:grid-cols-4">
        <Champ nom="venteDebut" id={id('venteDebut')} label="Début des ventes"><input id={id('venteDebut')} name="venteDebut" type="datetime-local" className="champ-texte" defaultValue={v.venteDebut} /></Champ>
        <Champ nom="venteFin" id={id('venteFin')} label="Fin des ventes"><input id={id('venteFin')} name="venteFin" type="datetime-local" className="champ-texte" defaultValue={v.venteFin} /></Champ>
        <Champ nom="limiteParCommande" id={id('limiteParCommande')} label="Limite par commande"><input id={id('limiteParCommande')} name="limiteParCommande" type="number" min={1} max={50} className="champ-texte" defaultValue={v.limiteParCommande} /></Champ>
        <Champ nom="ordre" id={id('ordre')} label="Ordre d'affichage"><input id={id('ordre')} name="ordre" type="number" min={0} className="champ-texte" defaultValue={v.ordre} /></Champ>
      </div>
    </>
  );
}
