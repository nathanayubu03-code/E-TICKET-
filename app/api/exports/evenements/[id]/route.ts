import { exportVentes } from '@/lib/admin/export';
import { auditer } from '@/lib/audit';
import { aUnRole, ROLES_EDITION } from '@/lib/auth/roles';
import { AccesRefuse, exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { slugifier } from '@/lib/slug';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let s;
  try { s = await exigerRole(['SUPERADMIN', 'ADMIN', 'ORGANISATEUR'], { rediriger: false }); } catch (e) { if (e instanceof AccesRefuse) return new Response('Non autorisé', { status: 401 }); throw e; }
  const e = await db.event.findUnique({ where: { id }, select: { titre: true, organisateurId: true } });
  const admin = aUnRole(s.user.roles, ROLES_EDITION);
  if (!e || (!admin && e.organisateurId !== s.user.organisateurId)) return new Response('Introuvable', { status: 404 });
  const fichier = await exportVentes(id, { telephonesComplets: admin });
  await auditer({ acteur: s.user, action: 'export.ventes', entite: 'Event', entiteId: id });
  return new Response(new Uint8Array(fichier), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="ventes-${slugifier(e.titre)}.xlsx"`, 'Cache-Control': 'private, no-store' } });
}
