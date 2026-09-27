type Arbre = { [cle: string]: string | Arbre };

/** Fusion profonde : les valeurs de `traduction` remplacent celles de `base` quand elles existent et ne sont pas vides. */
export function fusionner<T extends Arbre>(base: T, traduction: Arbre): T {
  const sortie: Arbre = { ...base };
  for (const [cle, valeur] of Object.entries(traduction)) {
    const origine = sortie[cle];
    if (typeof valeur === 'string') {
      if (valeur.trim() !== '' && typeof origine === 'string') sortie[cle] = valeur;
    } else if (origine && typeof origine === 'object') {
      sortie[cle] = fusionner(origine, valeur);
    }
  }
  return sortie as T;
}
