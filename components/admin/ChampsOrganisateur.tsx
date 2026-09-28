import { OPERATEURS } from '@/lib/operateurs';
import { Champ } from './FormAuto';

export interface ValeursOrga { nom: string; contactNom: string; telephone: string; email: string; reversementOperateur: string; reversementFin: string | null; commission: string; verifie: boolean }

export function ChampsOrganisateur({ v, tauxGlobal }: { v: ValeursOrga; tauxGlobal: number }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ nom="nom" label="Nom"><input id="nom" name="nom" className="champ-texte" defaultValue={v.nom} maxLength={120} /></Champ>
        <Champ nom="contactNom" label="Personne à contacter"><input id="contactNom" name="contactNom" className="champ-texte" defaultValue={v.contactNom} maxLength={120} /></Champ>
        <Champ nom="telephone" label="Téléphone"><input id="telephone" name="telephone" type="tel" className="champ-texte" defaultValue={v.telephone} /></Champ>
        <Champ nom="email" label="E-mail"><input id="email" name="email" type="email" className="champ-texte" defaultValue={v.email} /></Champ>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Champ nom="reversementOperateur" label="Opérateur de reversement">
          <select id="reversementOperateur" name="reversementOperateur" className="champ-select" defaultValue={v.reversementOperateur}>
            <option value="">Non renseigné</option>
            {OPERATEURS.map((o) => <option key={o.k} value={o.k}>{o.nom}</option>)}
          </select>
        </Champ>
        <Champ nom="reversementNumero" label="Numéro Mobile Money de reversement" aide={v.reversementFin ? `Enregistré, se termine par ${v.reversementFin}. Laisser vide pour le garder.` : 'Chiffré en base.'}>
          <input id="reversementNumero" name="reversementNumero" type="tel" className="champ-texte" autoComplete="off" />
        </Champ>
        <Champ nom="commission" label="Commission (%)" aide={`Vide : taux global (${tauxGlobal / 100} %).`}><input id="commission" name="commission" inputMode="decimal" className="champ-texte" defaultValue={v.commission} /></Champ>
      </div>
      <label className="case"><input type="checkbox" name="verifie" value="oui" defaultChecked={v.verifie} /><span>Badge « Vérifié » (identité et contrat contrôlés par l&apos;équipe)</span></label>
    </>
  );
}
