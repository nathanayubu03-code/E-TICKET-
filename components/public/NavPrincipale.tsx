'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavPrincipale({ liens, label }: { liens: { href: string; texte: string }[]; label: string }) {
  const chemin = usePathname();
  const actif = (href: string) => (href === '/' ? chemin === '/' || chemin.startsWith('/evenements') : chemin.startsWith(href.split('#')[0] ?? href));
  return (
    <nav className="nav" aria-label={label}>
      {liens.map((l) => (
        <Link key={l.href} href={l.href} aria-current={actif(l.href) ? 'page' : undefined}>{l.texte}</Link>
      ))}
    </nav>
  );
}
