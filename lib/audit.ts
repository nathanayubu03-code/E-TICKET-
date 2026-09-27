import { db, type Prisma, type Role } from './db';

export interface Acteur { id: string; roles: Role[] }

/** Journal d'audit non modifiable : qui a fait quoi, sur quoi, quand. */
export async function auditer(
  p: { acteur?: Acteur | null; action: string; entite: string; entiteId?: string | null; avant?: unknown; apres?: unknown; ip?: string | null },
  client: Prisma.TransactionClient = db,
): Promise<void> {
  await client.auditLog.create({
    data: {
      acteurId: p.acteur?.id ?? null,
      acteurRole: p.acteur?.roles[0] ?? null,
      action: p.action,
      entite: p.entite,
      entiteId: p.entiteId ?? null,
      avant: p.avant === undefined ? undefined : (JSON.parse(JSON.stringify(p.avant)) as Prisma.InputJsonValue),
      apres: p.apres === undefined ? undefined : (JSON.parse(JSON.stringify(p.apres)) as Prisma.InputJsonValue),
      ip: p.ip ?? null,
    },
  });
}
