# Billet vivant, QR code et lisibilité

## Contenu du billet

- Identifiant lisible `ET-XXXX-XXXX` (public, dicté au support). Alphabet sans 0/O ni 1/I.
- Code aléatoire de 128 bits en base32 (26 caractères `A-Z2-7`), généré par `crypto.randomBytes`. Il est à la fois le contenu du QR et le jeton du lien SMS (`/b/<code>`). Sa possession vaut billet, comme un billet papier.
- Empreinte SHA-256 du code (`Ticket.codeEmpreinte`) : c'est elle, et non le code, que le scanner télécharge.

## QR code

Contenu : `CODE_EVENEMENT/CODE_BILLET`, par exemple 6 + 1 + 26 = 33 caractères, uniquement des majuscules, chiffres et « / ». Le QR utilise le mode alphanumérique (5,5 bits par caractère), niveau de correction M : version 2, 25 × 25 modules. Pas de signature dans le QR (décision du 27/09/2026) : la sécurité repose sur le code aléatoire et sur la liste des empreintes tenue par le scanner (voir `docs/motifs.md` et l'étape 11).

Rendu : noir `#000000` sur blanc, 4 modules de marge, dans la zone centrale de la grille Kuba 11 × 11 (7 cases sur 11, 168 unités sur 264). Le QR n'est jamais animé ni recoloré ; seul le motif autour bouge.

`selAffichage` (sel du signe du moment) est public : le téléphone de l'acheteur en a besoin pour afficher le signe sans réseau. Il ne protège rien à lui seul.

## Mesure de lisibilité (Playwright, écran de 360 px)

Test : `tests/e2e/billet.spec.ts`. Vingt-cinq billets différents (codes aléatoires) sont ouverts à 360 px de large, pour quatre densités d'écran. La zone du motif est capturée puis décodée par ZXing en JavaScript, la bibliothèque de repli du scanner quand le navigateur n'a pas BarcodeDetector. Trois lectures par billet :

- image entière du motif avec le QR ;
- comme le scanner en repli : image entière, puis centre recadré (60 %), puis ce centre agrandi ;
- capture « dégradée » qui imite grossièrement une photo par la caméra du contrôleur : image réduite de moitié, léger flou, JPEG à 35 %.

Géométrie mesurée : le billet fait 280 px de large et la zone QR 178 px CSS (un peu plus que les 168 px de la maquette). Un module fait 5,4 px CSS, soit 5,4, 8,1, 10,8 et 16,2 pixels physiques pour des densités de 1, 1,5, 2 et 3.

Résultats de trois lancements successifs du 27/09/2026 (billets lus sur 25, dans l'ordre image entière / repli du scanner / capture dégradée) :

| Densité | Lancement 1 | Lancement 2 | Lancement 3 |
|---|---|---|---|
| 1 | 25 / 25 / 0 | 25 / 25 / 0 | 25 / 25 / 0 |
| 1,5 | 23 / 24 / 25 | 24 / 24 / 25 | 25 / 25 / 25 |
| 2 | 24 / 25 / 24 | 22 / 22 / 25 | 25 / 25 / 25 |
| 3 | 24 / 24 / 24 | 24 / 24 / 24 | 25 / 25 / 25 |

Le fichier `docs/billet-mesures.json` contient les chiffres du dernier lancement.

Ce que ces chiffres montrent :

1. Le QR a la bonne taille. La zone QR seule, recadrée à ses bords exacts, se lit 25 fois sur 25 ; les modules font 8 pixels physiques ou plus sur la plupart des téléphones.
2. Sur une image fixe, ZXing en JavaScript rate de 0 à 3 billets sur 25 selon le lancement, sans lien clair avec la densité. Ni le recadrage, ni l'agrandissement, ni un rendu à bords nets (`shape-rendering="crispEdges"`, conservé) ne font disparaître ces échecs. Je n'ai pas trouvé la cause ; confiance faible sur l'explication (sensibilité du binariseur de ZXing à certaines images).
3. La capture dégradée échoue à la densité 1 (2,7 pixels par module après réduction) et passe presque toujours dès 1,5. Les écrans de densité 1 sont devenus rares sur les téléphones vendus aujourd'hui.

## Risque ouvert et ce qui le réduit

- Le lecteur principal est **BarcodeDetector**, intégré à Chrome sur Android : ZXing n'est utilisé que s'il manque (iPhone, certains navigateurs). Ces mesures ne disent rien de BarcodeDetector, qui n'existe pas dans le Chromium de test.
- Le scanner analyse environ 3 images par seconde : une image ratée est suivie d'autres, légèrement différentes. Un échec sur une image fixe n'est pas un échec de contrôle.
- En dernier recours, le contrôleur saisit l'identifiant lisible `ET-XXXX-XXXX` (« Saisir le n° »), vérifié de la même façon.

**À faire avant l'ouverture** : essai réel avec deux ou trois téléphones de contrôleurs (dont un sans BarcodeDetector, par exemple un iPhone) et plusieurs téléphones d'acheteurs, en extérieur, luminosité au maximum, sur une centaine de billets. Si le taux de lecture au premier passage est insuffisant, deux pistes : évaluer un décodeur plus robuste pour le repli (zxing-cpp compilé en WebAssembly), ou agrandir le rendu du billet sur les écrans étroits (la grille reste 11 × 11).

## PDF

`/api/billets/<ET-XXXX-XXXX>/pdf` : format A6, polices standard du PDF (aucune police embarquée), QR vectoriel noir sur blanc, moins de 30 ko (vérifié par le test e2e). Accessible à l'acheteur connecté ou avec le jeton du lien SMS. Le PDF n'a pas de motif vivant : le billet sur téléphone reste le plus sûr à l'entrée, ce que le PDF rappelle.

## Hors ligne

À l'ouverture d'un billet (confirmation d'achat, lien SMS, Mes billets), le téléphone l'enregistre dans IndexedDB avec tout ce qu'il faut pour l'afficher sans réseau : textes, sel d'affichage, chemin SVG du QR et décalage d'horloge (heure du serveur moins heure du téléphone) mesuré à ce moment-là.
