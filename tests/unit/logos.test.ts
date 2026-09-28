import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error script Node sans déclaration de types
import { POIDS_MAX, recenser } from '../../outils/logos-operateurs.mjs';
import { FICHIERS_LOGOS, OPERATEURS } from '@/lib/operateurs';

// PNG minimal : signature + en-tête IHDR avec la largeur et la hauteur demandées.
function png(largeur: number, hauteur: number): Buffer {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8); b.write('IHDR', 12); b.writeUInt32BE(largeur, 16); b.writeUInt32BE(hauteur, 20);
  return b;
}

describe('logos des opérateurs', () => {
  it('le manifeste lib/logos-operateurs.json correspond au contenu de public/operateurs/', () => {
    const { logos, alertes } = recenser();
    expect(JSON.parse(readFileSync('lib/logos-operateurs.json', 'utf8')), 'relancer « npm run logos »').toEqual(logos);
    expect(alertes, 'logo trop lourd ou mal dimensionné').toEqual([]);
  });
  it('sans logo déposé, l’opérateur garde l’affichage de repli', () => {
    for (const o of OPERATEURS) expect(o.logo === null || o.logo.startsWith(`/operateurs/${FICHIERS_LOGOS[o.k]}.`)).toBe(true);
  });
  it('noms de fichiers exacts, SVG préféré, PNG carré de 256 px minimum, 20 ko maximum', () => {
    const d = mkdtempSync(join(tmpdir(), 'logos-'));
    writeFileSync(join(d, 'mpesa.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>');
    writeFileSync(join(d, 'mpesa.png'), png(512, 512));
    writeFileSync(join(d, 'airtel-money.png'), png(300, 120));
    writeFileSync(join(d, 'orange-money.svg'), 'x'.repeat(POIDS_MAX + 1));
    writeFileSync(join(d, 'Afrimoney.svg'), '<svg/>'); // mauvais nom : ignoré
    const { logos, alertes } = recenser(d);
    expect(Object.keys(logos).sort()).toEqual(['AIRTEL', 'MPESA', 'ORANGE']);
    expect(logos.MPESA).toMatch(/^\/operateurs\/mpesa\.svg\?v=[0-9a-f]{8}$/);
    expect(alertes.join('\n')).toMatch(/airtel-money\.png fait 300 × 120 px/);
    expect(alertes.join('\n')).toMatch(/orange-money\.svg pèse 20\.0 ko/);
  });
});
