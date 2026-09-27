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

Test : `tests/e2e/billet.spec.ts`. Le billet est ouvert à 360 px de large avec quatre densités d'écran, la zone du motif est capturée puis décodée par ZXing (la bibliothèque de repli du scanner). Une seconde lecture simule grossièrement une photo prise par la caméra du contrôleur : image réduite de moitié, léger flou, compression JPEG à 35 %.

Résultats du 27/09/2026 (fichier brut : `docs/billet-mesures.json`) :

| Densité (DPR) | Zone QR à l'écran | Taille d'un module | Pixels physiques par module | Capture nette | Capture dégradée |
|---|---|---|---|---|---|
| 1 | 178 px CSS | 5,4 px CSS | 5,4 | lu | non lu |
| 1,5 | 178 px CSS | 5,4 px CSS | 8,1 | lu | lu |
| 2 | 178 px CSS | 5,4 px CSS | 10,8 | lu | lu |
| 3 | 178 px CSS | 5,4 px CSS | 16,2 | lu | lu |

Lecture :

- Sur 360 px, le billet fait 280 px de large et la zone QR 178 px CSS, un peu plus que les 168 px prévus par la maquette. Un module fait 5,4 px CSS.
- La capture de l'écran se lit à toutes les densités.
- La capture dégradée échoue seulement à DPR 1 : après réduction de moitié, un module ne fait plus que 2,7 pixels. Les Android d'entrée de gamme vendus en RDC ont en général une densité de 1,5 à 2 (écrans 720 × 1600 environ) ; la plupart des cas réels sont donc dans les lignes 1,5 et 2. Confiance moyenne : cette simulation ne remplace pas un essai avec un vrai téléphone en plein soleil.

À faire avant l'ouverture (noté dans `docs/reste-a-faire.md`) : essai réel avec deux ou trois téléphones de contrôleurs et deux ou trois téléphones d'acheteurs, luminosité au maximum, en extérieur. Si la lecture est difficile, le levier le moins coûteux est d'agrandir le billet sur les écrans étroits (la grille reste 11 × 11, seul le rendu grandit).

## PDF

`/api/billets/<ET-XXXX-XXXX>/pdf` : format A6, polices standard du PDF (aucune police embarquée), QR vectoriel noir sur blanc, moins de 30 ko (vérifié par le test e2e). Accessible à l'acheteur connecté ou avec le jeton du lien SMS. Le PDF n'a pas de motif vivant : le billet sur téléphone reste le plus sûr à l'entrée, ce que le PDF rappelle.

## Hors ligne

À l'ouverture d'un billet (confirmation d'achat, lien SMS, Mes billets), le téléphone l'enregistre dans IndexedDB avec tout ce qu'il faut pour l'afficher sans réseau : textes, sel d'affichage, chemin SVG du QR et décalage d'horloge (heure du serveur moins heure du téléphone) mesuré à ce moment-là.
