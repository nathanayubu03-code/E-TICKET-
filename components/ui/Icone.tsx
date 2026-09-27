import { IC, type NomIcone } from '@/lib/icones';

export function Icone({ nom, taille = 20, epaisseur = 2, className }: { nom: NomIcone; taille?: number; epaisseur?: number; className?: string }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={epaisseur} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={IC[nom]} />
    </svg>
  );
}
