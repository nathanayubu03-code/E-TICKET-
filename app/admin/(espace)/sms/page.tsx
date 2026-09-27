import { exigerRole } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { ilYA } from '@/lib/temps';
import { env } from '@/lib/env';
import { dateLongue } from '@/lib/fuseaux';
import { masquerTelephone, normaliserTelephone } from '@/lib/telephone';

export const metadata = { title: 'SMS envoyés' };

export default async function JournalSms({ searchParams }: { searchParams: Promise<{ tel?: string }> }) {
  await exigerRole(['SUPERADMIN', 'ADMIN', 'AGENT']);
  const tel = normaliserTelephone((await searchParams).tel ?? '');
  const [sms, echecs] = await Promise.all([
    db.smsLog.findMany({ where: tel ? { telephone: tel } : {}, orderBy: { creeLe: 'desc' }, take: 100 }),
    db.smsLog.count({ where: { statut: 'ECHOUE', creeLe: { gte: ilYA(86400_000) } } }),
  ]);
  return (
    <div className="pile" style={{ ['--gap' as string]: '18px' }}>
      <h1 className="affiche" style={{ fontSize: 44 }}>SMS envoyés</h1>
      <p className="doux">Fournisseur : <b>{env().SMS_PROVIDER}</b>. Échecs sur 24 h : <b>{echecs}</b>. Les codes de connexion sont masqués.</p>
      <form className="rangee" style={{ maxWidth: 420 }}><input name="tel" type="tel" className="champ-texte" placeholder="Numéro" /><button className="btn" type="submit">Filtrer</button></form>
      {sms.length === 0 ? <div className="admin-panneau"><p>Aucun SMS pour le moment.</p></div> : (
        <div className="tableau-cadre"><table className="tableau">
          <thead><tr><th>Date</th><th>Numéro</th><th>Type</th><th>Statut</th><th>Message</th></tr></thead>
          <tbody>{sms.map((s) => (
            <tr key={s.id}><td>{dateLongue(s.creeLe)}</td><td>{masquerTelephone(s.telephone)}</td><td>{s.gabarit}</td>
              <td>{s.statut === 'ECHOUE' ? <b style={{ color: 'var(--danger)' }}>Échec</b> : s.statut === 'ENVOYE' ? 'Envoyé' : 'En file'}{s.erreur ? <div className="doux" style={{ fontSize: 12 }}>{s.erreur}</div> : null}</td>
              <td style={{ fontSize: 13, maxWidth: 420 }}>{s.gabarit === 'otp' ? s.contenu.replace(/\d{6}/, '••••••') : s.contenu}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
