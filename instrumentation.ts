export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { lireEnv, verifierDemarrage } = await import('./lib/env');
  verifierDemarrage(lireEnv());
}
