import { getLocale, getTranslations } from 'next-intl/server';
import { sessionCourante } from '@/lib/auth/session';
import { pdfBillet } from '@/lib/billets/pdf';
import { db } from '@/lib/db';
import { texteEvenement } from '@/lib/langue';

export const dynamic = 'force-dynamic';

// PDF d'un billet : pour son acheteur connecté, ou avec le jeton du lien SMS (?jeton=).
export async function GET(req: Request, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const jeton = new URL(req.url).searchParams.get('jeton');
  const b = await db.ticket.findUnique({ where: { publicId }, include: { typeBillet: true, commande: true, evenement: { include: { lieu: true, ville: true } } } });
  if (!b || b.statut === 'ANNULE') return new Response('Introuvable', { status: 404 });
  const s = await sessionCourante();
  const autorise = (jeton && jeton === b.code) || (s && (b.commande.userId === s.user.id || b.commande.telephone === s.user.telephone));
  if (!autorise) return new Response('Introuvable', { status: 404 });
  const langue = await getLocale();
  const t = await getTranslations('billet');
  const pdf = await pdfBillet({
    publicId: b.publicId, code: b.code, categorie: b.typeBillet.nom, titulaire: b.titulaire, entree: b.entree, prixPayeCdf: b.prixPayeCdf,
    evenement: { code: b.evenement.code, titre: texteEvenement(b.evenement, 'titre', langue), sousTitre: b.evenement.sousTitre, debutLe: b.evenement.debutLe, fuseau: b.evenement.ville?.fuseau ?? b.evenement.fuseau, lieu: b.evenement.lieu?.nom ?? '', ville: b.evenement.ville?.nom ?? '' },
  }, { titre: t('pdfTitre', { id: b.publicId }), numero: t('numero'), categorie: t('categorie'), prixPaye: t('prixPaye'), titulaire: t('titulaire'), entree: t('entree'), mention: t('pdfMention') }, langue);
  return new Response(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="billet-${b.publicId}.pdf"`, 'Cache-Control': 'private, no-store' } });
}
