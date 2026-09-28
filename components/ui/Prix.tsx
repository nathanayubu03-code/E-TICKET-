import { montant } from '@/lib/argent';

/**
 * Prix d'une catégorie : « 25 000 CDF · 10 USD » si l'USD est saisi, sinon le CDF seul (aucun équivalent
 * calculé). Chaque montant reste sur une ligne ; la ligne peut se couper entre les deux devises en 360 px.
 */
export function Prix({ cdf, usd, langue, gratuit }: { cdf: number; usd: number | null | undefined; langue?: string; gratuit?: string }) {
  const franc = montant(cdf, 'CDF', langue, gratuit);
  if (usd === null || usd === undefined || cdf === 0) return <span className="insecable">{franc}</span>;
  return <><span className="insecable">{franc}</span> · <span className="insecable">{montant(usd, 'USD', langue)}</span></>;
}
