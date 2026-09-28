// Nom affiché d'une catégorie de référence dans la langue du visiteur (messages categories.*).
// Une catégorie hors référentiel garde le nom saisi en base.
type Traducteur = { (cle: string): string; has(cle: string): boolean };

export function nomCategorie(t: Traducteur, c: { slug: string; nom: string } | null | undefined, pluriel = false): string {
  if (!c) return '';
  const cle = `categories.${c.slug}.${pluriel ? 'plusieurs' : 'un'}`;
  return t.has(cle) ? t(cle) : pluriel ? c.nom : c.nom.replace(/s$/, '');
}
