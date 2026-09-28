'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function MenuAdmin({ liens }: { liens: { href: string; texte: string }[] }) {
  const chemin = usePathname();
  const actif = (href: string) => (href === '/admin' ? chemin === '/admin' : chemin === href || chemin.startsWith(href + '/'));
  return (
    <>
      {liens.map((l) => <Link key={l.href} href={l.href} aria-current={actif(l.href) ? 'page' : undefined}>{l.texte}</Link>)}
    </>
  );
}
