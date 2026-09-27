import { notFound } from 'next/navigation';
import { VueEvenement } from '@/components/evenement/VueEvenement';
import { ROLES_ADMIN } from '@/lib/auth/roles';
import { exigerRole } from '@/lib/auth/session';
import { evenementPourApercu } from '@/lib/evenements';

export default async function EtapeApercu({ params }: { params: Promise<{ id: string }> }) {
  await exigerRole(ROLES_ADMIN);
  const e = await evenementPourApercu((await params).id);
  if (!e) notFound();
  return (
    <div className="pile" style={{ ['--gap' as string]: '12px' }}>
      <p className="note note-info">Aperçu exact de la page publique. Le panier est désactivé.</p>
      <div style={{ backgroundImage: 'var(--motif)', backgroundSize: '420px', padding: 16, borderRadius: 16, border: '2px solid var(--encre)' }}>
        <VueEvenement e={e} apercu />
      </div>
    </div>
  );
}
