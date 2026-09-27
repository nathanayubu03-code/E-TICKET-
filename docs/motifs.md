# Système de motifs Kuba : note pour le développeur

Référence exécutable : `site/assets/kuba.js` (réexporté par `src/kuba/kuba.js`) (sans dépendance, testé par `npm test`). Le canvas de design (`design/project/Kuba.dc.html`) utilise le même algorithme, vérifié à l'identique.

## Principe

Chaque billet affiche autour de son QR code un motif géométrique inspiré des velours Kuba. Le motif dépend de deux entrées seulement : l'identifiant du billet et la phase, un entier qui avance toutes les 30 secondes. Même entrée, même motif, sur n'importe quel appareil, sans réseau.

Le motif sert au contrôle visuel : il respire lentement (animation d'opacité de 9 s) et se recompose toutes les 30 s. Une capture d'écran reste figée. La preuve cryptographique reste le QR code (voir plus bas).

## Algorithme, étape par étape

1. Graine. `graine = fnv1a(id)` (FNV-1a 32 bits sur les codes UTF-16). Implémentation : 10 lignes, identique en JS, Kotlin, Swift ou Go à condition de travailler en entiers non signés 32 bits (`Math.imul` puis `>>> 0` en JS).
2. Génome. `palette = PALETTES[graine % 5]`. Symétrie : rotation d'un quart de tour si `(graine >>> 3) & 1` vaut 1 et que la grille est carrée, sinon miroir horizontal et vertical. En mode miroir, seuls les motifs symétriques sont autorisés (losange, losange emboîté, croix, sablier, points, bandes).
3. Grille. Billet : 11 × 11 cases de 24 unités. Les cases de `x, y ∈ [2, 8]` sont réservées au QR code, il reste un anneau de 2 cases.
4. Case canonique. Pour chaque case, on calcule ses images par le groupe de symétrie et on garde la plus petite selon `y * 64 + x`. Toutes les cases d'une même orbite partagent donc le même tirage, d'où la symétrie.
5. Tirage par case. `h = fnv1a(id + '#' + cle)` avec `cle = y * 64 + x` de la case canonique.
   - `(h >>> 9) % 6 === 0` : case vide (respiration visuelle).
   - motif : `autorises[h % autorises.length]`.
   - orientation : `((h >>> 5) % 4) + correction de rotation + tourne`, modulo 4, en quarts de tour horaires.
   - couleur : `((h >>> 3) % 3 + phase) % 3`.
   - `tourne = phase` si `(h >>> 7) & 1`, sinon 0 : la moitié des cases pivote à chaque phase.
6. Rendu. Les polygones sont regroupés par couleur : trois `<path>` SVG en `fill-rule="evenodd"` sur un `<rect>` de fond. Poids mesuré : environ 4 Ko de SVG par billet, zéro image.
7. Animation. Chaque couche de couleur pulse en opacité (1 → 0,5 → 1 sur 9 s), décalées de 3 s. `prefers-reduced-motion` coupe la pulsation ; le changement de phase reste.

## Phase et horloge

`phase = floor((Date.now() + decalage) / 30000)`. Le `decalage` est l'écart heure serveur moins heure du téléphone, mesuré quand le billet est téléchargé et stocké avec lui. Beaucoup de téléphones ont une heure fausse ; sans ce décalage, le motif du billet et celui du scanner divergeraient. Le scanner fait la même mesure à chaque synchronisation. Tolérance conseillée côté contrôleur : phase courante ou phase précédente.

## Signe du moment

`signeDuMoment(selEvenement, phase)` renvoie l'un des 8 signes (losange ou carré, jaune, bleu, rouge ou blanc). Il est identique pour tous les billets d'un événement pendant 30 s. Le billet et l'écran du scanner l'affichent : le contrôleur compare d'un coup d'œil, avant même de scanner.

## Parcours du contrôleur

1. Avant le scan : le signe du billet correspond-il à celui du scanner ? Le motif bouge-t-il ?
2. Scan du QR code : le scanner vérifie la signature hors ligne.
3. Écran vert : le scanner montre le motif attendu pour ce billet à cette phase. Il doit être identique à celui du téléphone.

## Ce que le motif ne fait pas

Il ne remplace pas la sécurité du QR code. Le calcul est public dans l'application : quelqu'un de motivé peut reproduire l'animation. Recommandation pour le QR : charge utile `id | evenement | categorie | emission` signée par le serveur en Ed25519, clé publique embarquée dans l'application du scanner, liste des billets déjà scannés synchronisée entre appareils dès qu'il y a du réseau. Le motif rend la fraude par capture d'écran visible au premier regard, la signature la rend inutile.

## Lisibilité et scan

- QR noir `#000000` sur blanc `#FFFFFF`, 4 modules de marge blanche, jamais animé, jamais recoloré.
- Le motif ne touche pas la zone blanche. Luminosité au maximum : le contraste du QR ne change pas.
- Mode sombre : le billet garde son fond clair autour du QR.
- Taille minimale du QR à l'écran : 168 px CSS (environ 25 modules de 6,7 px).

## Autres usages de la trame

La même fonction génère les vignettes d'événements (`motifKuba('EVT-…', { cols: 4, rows: 5, trou: false })`) et les bandeaux de marque. Chaque événement a donc son visuel, sans photo à télécharger.
