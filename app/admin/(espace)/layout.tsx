import type { Metadata } from 'next';
import { Logo } from '@/components/public/Logo';
import { MenuAdmin } from '@/components/admin/MenuAdmin';
import { seDeconnecter } from '@/app/admin/connexion/actions';
import { ACCES_ADMIN, aUnRole, ROLES_ADMIN } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { masquerTelephone } from '@/lib/telephone';

export const metadata: Metadata = { title: { default: 'Administration', template: '%s · Administration e-Ticket' }, robots: { index: false } };
export const dynamic = 'force-dynamic';

const LIENS = [
  { href: '/admin', texte: 'Tableau de bord' },
  { href: '/admin/evenements', texte: 'Événements' },
  { href: '/admin/organisateurs', texte: 'Organisateurs' },
  { href: '/admin/commandes', texte: 'Commandes et billets' },
  { href: '/admin/paiements', texte: 'Paiements' },
  { href: '/admin/reversements', texte: 'Reversements' },
  { href: '/admin/controleurs', texte: 'Contrôleurs' },
  { href: '/admin/promos', texte: 'Codes promo' },
  { href: '/admin/sms', texte: 'SMS envoyés' },
  { href: '/admin/parametres', texte: 'Paramètres' },
  { href: '/admin/audit', texte: "Journal d'audit" },
  { href: '/admin/compte', texte: 'Mon compte' },
];

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const s = await exigerRole(ROLES_ADMIN);
  const liens = LIENS.filter((l) => {
    const acces = ACCES_ADMIN.find((a) => l.href === a.prefixe || l.href.startsWith(a.prefixe + '/'));
    return acces ? aUnRole(s.user.roles, acces.roles) : false;
  });
  return (
    <div className="admin-corps" style={{ background: 'var(--fond)' }}>
      <div className="admin-cadre">
        <nav className="admin-menu" aria-label="Administration">
          <div style={{ padding: '4px 8px 12px' }}><Logo taille={32} rdc={false} /></div>
          <MenuAdmin liens={liens} />
          <div style={{ marginTop: 'auto', padding: '12px 8px 0', fontSize: 'var(--t-petit)' }} className="doux">
            {s.user.nom ?? masquerTelephone(s.user.telephone)}<br />{s.user.roles.join(', ')}
          </div>
          <form action={seDeconnecter}><button className="lien-bouton" type="submit">Se déconnecter</button></form>
        </nav>
        <main className="admin-contenu">{children}</main>
      </div>
    </div>
  );
}
