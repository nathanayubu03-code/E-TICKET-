# Design : tokens et écarts

La référence est `design/maquette/assets/styles.css`. L'application reprend ses variables sans les modifier dans `app/styles/tokens.css` et ses classes dans `app/styles/maquette.css`. Les utilitaires Tailwind v4 (`bg-surface`, `text-encre`, `shadow-panneau`…) sont déclarés dans `app/globals.css` avec `@theme inline` et pointent tous vers ces variables : le mode sombre change les variables, pas les classes.

`tokens/theme.css` (Tailwind v4) et `tokens/tailwind.config.cjs` (Tailwind v3) datent du canvas de design. Ils ne sont pas utilisés par l'application et ne sont pas modifiés. Écarts constatés avec styles.css :

| Point | styles.css (fait foi) | tokens/theme.css |
|---|---|---|
| Bascule du thème | attribut `data-theme="dark"` sur `<html>` et `prefers-color-scheme` quand aucun choix n'est fait | classe `.dark` |
| Préfixe des variables | aucun (`--fond`) | `--et-` (`--et-fond`) |
| Ombre en mode sombre | `--ombre: #000000` | `--et-ombre: transparent` |
| Halo de focus | `--focus-halo` : `#BFDDFF` clair, `#4A3D08` sombre | absent |
| Contour des actions | `--contour` : `#14120E` clair, `#FFD21F` sombre | nommé `--et-contour-action`, mêmes valeurs |
| Texte sur succès plein | `--sur-succes` | nommé `--et-sur-succes-plein`, mêmes valeurs |
| Couleurs de marque en variables | `--soleil`, `--braise`, `--ciel` | seulement dans `@theme` (`--color-soleil-400`…) |
| Motif de fond | `--motif` (clair et sombre) | absent |
| Polices | `--affiche`, `--texte` | `--font-affiche`, `--font-texte`, mêmes piles |
| Échelle typographique, rayons nommés, animations | valeurs écrites dans les classes | déclarées comme tokens (`--text-affiche-2xl`, `--radius-billet`…) |

Aucune valeur de couleur commune ne diffère en dehors de l'ombre sombre.

## Ce qui change par rapport au fichier de la maquette

Deux substitutions seulement, faites mécaniquement :

- chemin des motifs : `url("motif-fond.svg")` devient `url("/motifs/motif-fond.svg")` (fichiers copiés dans `public/motifs/`) ;
- polices : `--affiche` et `--texte` commencent par les variables de `next/font` (`--font-anybody`, `--font-atkinson`), suivies des mêmes replis.

Les écrans que la maquette HTML ne couvre pas (formulaires et tableaux d'administration, scanner) sont dans `app/styles/complements.css`, construits avec les mêmes variables, bordures de 2 px et ombres dures.
