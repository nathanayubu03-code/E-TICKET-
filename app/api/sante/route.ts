// Sonde de disponibilité (serveur démarré), sans accès à la base.
export function GET() {
  return Response.json({ ok: true });
}
