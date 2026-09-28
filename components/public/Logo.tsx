/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

export function Logo({ taille = 40, rdc = true, label }: { taille?: number; rdc?: boolean; label?: string }) {
  return (
    <Link className="logo" href="/" aria-label={label}>
      <img src="/logo.svg" width={taille} height={taille} alt="" />
      <span style={taille < 40 ? { fontSize: 'var(--t-logo-petit)' } : undefined}>e-Ticket</span>
      {rdc ? <span className="rdc">RDC</span> : null}
    </Link>
  );
}
