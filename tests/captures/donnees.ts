import { creerEvenement, viderEvenements } from '../e2e/aide';

// Jeux de données des captures. Les libellés sont volontairement neutres (« Événement test »)
// pour que les captures ne montrent aucun nom inventé.
export async function preparer(jeu: string) {
  await viderEvenements();
  if (jeu === 'vide') return;
  await creerEvenement({ titre: 'Événement test 1', slug: 'capture-1', sousTitre: 'Sous-titre saisi par un administrateur', genre: 'Genre', ville: 'Kinshasa', cat: 'concert', dansJours: 6,
    description: 'Description saisie par un administrateur.',
    types: [{ nom: 'Catégorie A', prix: 150000, quota: 50, restant: 12 }, { nom: 'Catégorie B', prix: 50000, quota: 800 }, { nom: 'Catégorie C', prix: 15000, quota: 1000, restant: 0 }],
    programme: [{ heure: '18:00', titre: 'Ouverture des portes' }, { heure: '20:00', titre: 'Début', detail: 'Détail saisi par un administrateur' }] });
  if (jeu === 'un') return;
  await creerEvenement({ titre: 'Événement test 2', slug: 'capture-2', ville: 'Lubumbashi', cat: 'football', dansJours: 9, types: [{ nom: 'Tribune', prix: 5000, quota: 2000 }] });
  await creerEvenement({ titre: 'Événement test 3', slug: 'capture-3', ville: 'Goma', cat: 'festival', dansJours: 14, types: [{ nom: 'Pass', prix: 10000, quota: 500, restant: 18 }] });
  await creerEvenement({ titre: 'Événement test 4', slug: 'capture-4', ville: 'Kinshasa', cat: 'conference', dansJours: 16, types: [{ nom: 'Entrée', prix: 0, quota: 300 }] });
  await creerEvenement({ titre: 'Événement test 5', slug: 'capture-5', ville: 'Kinshasa', cat: 'spectacle', dansJours: 20, types: [{ nom: 'Place', prix: 8000, quota: 200 }] });
}
