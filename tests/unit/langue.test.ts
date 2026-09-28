import { describe, expect, it } from 'vitest';
import { cdf, formaterNombre } from '@/lib/argent';
import { nomCategorie } from '@/lib/categorie';
import { dateCourte, dateLongue, tampon } from '@/lib/fuseaux';
import { langueSure, texteEvenement } from '@/lib/langue';
import { smsBillets, smsCodeOtp, smsNouvelEvenement } from '@/lib/sms/gabarits';

const date = new Date('2026-11-14T19:00:00Z'); // 20:00 à Kinshasa

describe('contenu saisi par l’administrateur', () => {
  const e = { titre: 'Concert du fleuve', titreEn: 'River concert', description: 'Texte', descriptionEn: '   ', infosPratiques: 'Parking', infosPratiquesEn: null };
  it('anglais quand il est renseigné, français sinon, jamais de traduction automatique', () => {
    expect(texteEvenement(e, 'titre', 'en')).toBe('River concert');
    expect(texteEvenement(e, 'titre', 'fr')).toBe('Concert du fleuve');
    expect(texteEvenement(e, 'description', 'en')).toBe('Texte'); // champ anglais vide
    expect(texteEvenement(e, 'infosPratiques', 'en')).toBe('Parking');
    expect(texteEvenement(e, 'titre', 'ln')).toBe('Concert du fleuve');
  });
  it('langue inconnue ramenée au français', () => {
    expect(langueSure('en')).toBe('en');
    expect(langueSure('de')).toBe('fr');
    expect(langueSure(null)).toBe('fr');
  });
});

describe('formats de la langue choisie', () => {
  it('nombres', () => {
    expect(formaterNombre(25000, 'fr')).toBe('25 000');
    expect(formaterNombre(25000, 'en')).toBe('25,000');
    expect(cdf(25000, 'Free', 'en')).toBe('25,000 CDF');
    expect(formaterNombre(25000, 'sw')).toBe('25 000'); // swahili : format français tant que la traduction manque
  });
  it('dates', () => {
    expect(dateCourte(date, 'Africa/Kinshasa', 'fr')).toBe('Sam. 14 nov. · 20:00');
    expect(dateCourte(date, 'Africa/Kinshasa', 'en')).toBe('Sat 14 Nov · 20:00');
    expect(dateLongue(date, 'Africa/Kinshasa', 'en')).toBe('14 Nov 2026 at 20:00');
    expect(tampon(date, 'Africa/Lubumbashi', 'en')).toEqual({ jour: '14', mois: 'Nov' });
  });
  it('noms de catégorie', () => {
    const t = Object.assign((k: string) => ({ 'categories.conference.un': 'Talk', 'categories.conference.plusieurs': 'Talks' } as Record<string, string>)[k]!, { has: (k: string) => k.startsWith('categories.conference') });
    expect(nomCategorie(t, { slug: 'conference', nom: 'Conférences' })).toBe('Talk');
    expect(nomCategorie(t, { slug: 'conference', nom: 'Conférences' }, true)).toBe('Talks');
    expect(nomCategorie(t, { slug: 'autre', nom: 'Galas' })).toBe('Gala');
  });
});

describe('SMS dans la langue du destinataire', () => {
  it('anglais ou français, marque identique', () => {
    expect(smsBillets('River concert', [], 'en')).toMatch(/^e-Ticket RDC: payment received, your tickets for River concert are ready\./);
    expect(smsBillets('Concert', [], 'fr')).toMatch(/^e-Ticket RDC : paiement reçu/);
    expect(smsBillets('Concert', [], 'ln')).toMatch(/^e-Ticket RDC : paiement reçu/);
    expect(smsCodeOtp('123456', 'en')).toContain('your code is 123456');
    expect(smsNouvelEvenement('Show', 'Goma', 'Sat 14 Nov · 20:00', 'show', 'en')).toContain('Show in Goma, Sat 14 Nov · 20:00. Tickets on sale.');
  });
});
