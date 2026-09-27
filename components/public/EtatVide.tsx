import { ecart } from '@/lib/style';

export function LosangesVides() {
  return (
    <svg width="96" height="96" viewBox="0 0 120 120" aria-hidden="true">
      <path d="M60 6L114 60L60 114L6 60Z" fill="none" stroke="var(--trait)" strokeWidth="6" />
      <path d="M60 26L94 60L60 94L26 60Z" fill="none" stroke="#1E8FFF" strokeWidth="6" />
      <path d="M60 46L74 60L60 74L46 60Z" fill="#FFD21F" stroke="var(--encre)" strokeWidth="3" />
    </svg>
  );
}

export function EtatVide({ titre, texte, children }: { titre: string; texte?: string; children?: React.ReactNode }) {
  return (
    <div className="panneau pile" style={ecart(12, { alignItems: 'center', textAlign: 'center' })}>
      <LosangesVides />
      <h3 className="affiche" style={{ fontSize: 32 }}>{titre}</h3>
      {texte ? <p className="doux">{texte}</p> : null}
      {children ? <div className="rangee envelopper" style={{ justifyContent: 'center' }}>{children}</div> : null}
    </div>
  );
}
