import type { InfoOperateur } from '@/lib/operateurs';

/**
 * Logo officiel d'un opérateur, dans un carré blanc arrondi (lisible en mode clair comme en sombre),
 * sans déformation. Rien n'est rendu tant que le logo n'est pas déposé : l'appelant garde alors son
 * affichage de repli. Le nom de l'opérateur est toujours écrit à côté, d'où le texte alternatif vide.
 */
export function LogoOperateur({ op, taille }: { op: Pick<InfoOperateur, 'logo'>; taille: 24 | 40 }) {
  if (!op.logo) return null;
  return (
    <span className={`logo-op logo-op-${taille}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- fichier statique de quelques ko, sans optimisation d'image */}
      <img src={op.logo} alt="" width={taille} height={taille} decoding="async" loading="lazy" />
    </span>
  );
}
