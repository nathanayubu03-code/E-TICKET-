# Logos des opérateurs Mobile Money

Les logos officiels s'affichent sur la carte de choix de l'opérateur (40 px), sur l'écran d'attente, sur le reçu et dans le bloc « Payer avec Mobile Money » de l'accueil (24 px). Le nom de l'opérateur est toujours écrit à côté du logo, pour l'accessibilité et pour les logos peu lisibles en petit.

Tant qu'un logo n'est pas déposé, l'opérateur garde l'affichage de repli : son nom en texte sur sa couleur. Le site n'affiche jamais d'image cassée : il n'affiche que les logos réellement présents, listés au moment du build.

## Fichiers attendus

Dossier `public/operateurs/`, noms exacts (en minuscules) :

| Opérateur | Fichier |
|---|---|
| Airtel Money | `airtel-money.svg` (ou `.png`) |
| M-Pesa | `mpesa.svg` (ou `.png`) |
| Orange Money | `orange-money.svg` (ou `.png`) |
| Afrimoney | `afrimoney.svg` (ou `.png`) |

- Format : `.svg` de préférence. Sinon `.png` **carré**, 256 × 256 px minimum.
- Poids : 20 ko maximum par fichier.
- Pas de marge blanche énorme autour du logo : il est affiché dans un carré blanc arrondi, proportions conservées (jamais étiré).
- Utiliser uniquement les logos officiels fournis par l'opérateur ou l'agrégateur, avec leur autorisation d'usage.

## Remplacer ou ajouter un logo

1. Préparer le fichier (nom exact, format, poids). Pour un PNG trop lourd : [Squoosh](https://squoosh.app) en gardant le format PNG (réglage OxiPNG, réduction de palette), ou `pngquant --quality 70-90 fichier.png`. Pour un SVG : [SVGOMG](https://jakearchibald.github.io/svgomg/).
2. Le copier dans `public/operateurs/` (en remplaçant l'ancien s'il existe ; supprimer l'ancien `.png` si on passe au `.svg`).
3. Lancer `npm run logos`. Le script met à jour `lib/logos-operateurs.json` (avec une empreinte dans l'adresse, pour que les téléphones ne gardent pas l'ancien logo en cache) et signale un fichier trop lourd ou mal dimensionné.
4. Lancer `npm test` : le test `tests/unit/logos.test.ts` échoue si le manifeste n'est pas à jour, si un fichier dépasse 20 ko ou si un PNG n'est pas carré de 256 px minimum.
5. Commit et push. Le build Vercel relance `npm run logos` de toute façon (`vercel-build`).

Pour retirer un logo : supprimer le fichier, relancer `npm run logos`, commit.

## Où c'est dans le code

- `lib/operateurs.ts` : `FICHIERS_LOGOS` (noms de fichiers) et `logo` de chaque opérateur (lu dans `lib/logos-operateurs.json`).
- `components/ui/LogoOperateur.tsx` : le carré blanc arrondi, tailles 24 et 40.
- `outils/logos-operateurs.mjs` : le recensement des fichiers.
- Clic sur un opérateur dans le bloc de l'accueil : `/payer-avec/<fichier>` retient l'opérateur (cookie `et-operateur`) pour le présélectionner à l'écran de paiement, puis affiche les événements.
