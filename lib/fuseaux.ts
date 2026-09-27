// Toutes les dates sont stockées en UTC et affichées dans le fuseau de la ville de l'événement.

export const FUSEAU_DEFAUT = 'Africa/Kinshasa';

function parties(date: Date, fuseau: string, options: Intl.DateTimeFormatOptions) {
  return Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau, ...options }).formatToParts(date).map((p) => [p.type, p.value]));
}

const majuscule = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/** « Sam. 14 nov. · 20:00 » */
export function dateCourte(date: Date, fuseau = FUSEAU_DEFAUT): string {
  const p = parties(date, fuseau, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${majuscule(p.weekday ?? '')} ${p.day} ${p.month} · ${p.hour}:${p.minute}`;
}

/** Jour et mois pour le tampon : { jour: '14', mois: 'nov.' } */
export function tampon(date: Date, fuseau = FUSEAU_DEFAUT): { jour: string; mois: string } {
  const p = parties(date, fuseau, { day: 'numeric', month: 'short' });
  return { jour: p.day ?? '', mois: p.month ?? '' };
}

/** « 20:00 » */
export function heure(date: Date, fuseau = FUSEAU_DEFAUT): string {
  const p = parties(date, fuseau, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.hour}:${p.minute}`;
}

/** « 14/11 » pour « taux indicatif du 14/11 » */
export function jourMois(date: Date, fuseau = FUSEAU_DEFAUT): string {
  const p = parties(date, fuseau, { day: '2-digit', month: '2-digit' });
  return `${p.day}/${p.month}`;
}

/** « 14 nov. 2026 à 20:00 » */
export function dateLongue(date: Date, fuseau = FUSEAU_DEFAUT): string {
  const p = parties(date, fuseau, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.day} ${p.month} ${p.year} à ${p.hour}:${p.minute}`;
}

/**
 * Convertit une date et une heure locales (saisies dans le fuseau de la ville) en instant UTC.
 * `jour` : AAAA-MM-JJ, `hhmm` : HH:mm.
 */
export function localVersUtc(jour: string, hhmm: string, fuseau: string): Date {
  const [a, m, j] = jour.split('-').map(Number) as [number, number, number];
  const [h, mi] = hhmm.split(':').map(Number) as [number, number];
  const naif = Date.UTC(a, m - 1, j, h, mi);
  // Décalage du fuseau à cet instant (les fuseaux de la RDC n'ont pas d'heure d'été).
  const p = parties(new Date(naif), fuseau, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const vu = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  return new Date(naif - (vu - naif));
}

/** Inverse de localVersUtc : { jour: 'AAAA-MM-JJ', heure: 'HH:mm' } dans le fuseau. */
export function utcVersLocal(date: Date, fuseau: string): { jour: string; heure: string } {
  const p = parties(date, fuseau, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return { jour: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}:${p.minute}` };
}
