import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Le site part en production vide : aucun nom, lieu ou texte de démonstration ne doit
// apparaître dans le code de l'application.
const INTERDITS = ['Nuit de la Rumba', 'Kin Malebo', 'Kin Productions', 'Mama Kasa', 'lorem', 'EVT-RUMBA'];
const DOSSIERS = ['app', 'components', 'lib'];
const TIRETS = ['—', '–'];

function fichiers(dossier: string): string[] {
  let sortie: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) sortie = sortie.concat(fichiers(chemin));
    else if (/\.(tsx?|css|json|md)$/.test(nom)) sortie.push(chemin);
  }
  return sortie;
}

const tous = DOSSIERS.flatMap(fichiers);

describe('aucun contenu inventé', () => {
  it('trouve des fichiers à contrôler', () => {
    expect(tous.length).toBeGreaterThan(0);
  });
  for (const mot of INTERDITS) {
    it(`« ${mot} » n'apparaît nulle part dans app/, components/, lib/`, () => {
      const fautifs = tous.filter((f) => readFileSync(f, 'utf8').toLowerCase().includes(mot.toLowerCase()));
      expect(fautifs).toEqual([]);
    });
  }
  it('aucun tiret cadratin ou demi-cadratin dans les textes (app, components, lib, messages)', () => {
    const cibles = [...tous, ...fichiers('messages')];
    const fautifs = cibles.filter((f) => TIRETS.some((c) => readFileSync(f, 'utf8').includes(c)));
    expect(fautifs).toEqual([]);
  });
});
