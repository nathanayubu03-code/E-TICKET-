// Garde-fous du seed de démonstration : jamais en production.
const HOTES_AUTORISES = ['localhost', '127.0.0.1', '::1', 'db', 'postgres'];

export function verifierSeedDemoAutorise(env: Record<string, string | undefined>): void {
  if (env.NODE_ENV === 'production' || env.APP_ENV === 'production') {
    throw new Error('Seed de démonstration refusé : environnement de production.');
  }
  let hote = '';
  try {
    hote = new URL(env.DATABASE_URL ?? '').hostname;
  } catch {
    throw new Error('Seed de démonstration refusé : DATABASE_URL illisible.');
  }
  if (!HOTES_AUTORISES.includes(hote)) {
    throw new Error(`Seed de démonstration refusé : la base « ${hote} » n'est pas une base locale (${HOTES_AUTORISES.join(', ')}).`);
  }
}
