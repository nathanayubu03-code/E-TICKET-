# e-Ticket RDC · identité visuelle et écrans

Billetterie d'événements pour la RDC, pensée pour des Android d'entrée de gamme en 360 px, la 3G instable, le plein soleil et le paiement Mobile Money.

Canvas de design (logos, tokens, motifs, 10 écrans en clair et en sombre, composants) : https://claude.ai/artifact/NcyNXr97TwbdXJ7gAGXTEM

## Contenu

- `design/project/` : sources du canvas. Un fichier `.dc.html` par planche, `canvas.json` pour la disposition.
  - `Main` : trois pistes de logo. `Tokens` : palette, typographie, espacements, rayons, ombres. `Motifs` : système Kuba.
  - `Accueil`, `Evenement`, `Billets`, `Connexion`, `Paiement`, `Attente` (4 états), `Confirmation`, `MesBillets`, `Etats` (vide, chargement, réseau), `Scanner` (prêt, valide, refusé, déjà scanné), `Dashboard` (1280 px).
  - Chaque écran prend une propriété `dark`. Les fichiers `*Sombre.dc.html` et les états sont de simples variantes.
  - Composants réutilisables : `Logo`, `Kuba` (moteur de motif), `Billet` (billet vivant), `Composants` (bibliothèque).
- `tokens/theme.css` : tokens pour Tailwind v4 (`@theme`), thème clair et sombre par variables.
- `tokens/tailwind.config.cjs` : les mêmes tokens pour Tailwind v3.
- `src/kuba/kuba.js` : moteur de motif de référence, identique au canvas. `npm test` lance les tests.
- `docs/motifs.md` : logique du système de motifs, à lire avant de coder le billet et le scanner.
- `docs/libelles.md` : libellés clés en français, lingala et swahili, à faire valider.

## Règles d'interface

Zones tactiles de 48 px minimum. Contraste AA partout (ratios dans la planche Tokens). Montants toujours avec la devise, CDF d'abord, USD indicatif ensuite. Vert réservé au succès. Pas de photo : aplats, SVG et trame Kuba. Polices : Anybody pour l'affiche, Atkinson Hyperlegible pour le texte, avec repli système.
