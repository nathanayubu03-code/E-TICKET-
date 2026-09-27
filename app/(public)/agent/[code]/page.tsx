import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { FormAgent } from '@/components/achat/FormAgent';
import { commandeDeLAcheteur } from '@/lib/achat';
import { cdf } from '@/lib/argent';
import { sessionCourante } from '@/lib/auth/session';
import { OPERATEURS } from '@/lib/operateurs';
import { parametre } from '@/lib/parametres';
import { ecart } from '@/lib/style';
import { chiffresNationaux, formaterTelephone, normaliserTelephone } from '@/lib/telephone';

export const metadata: Metadata = { title: 'Payer chez un agent', robots: { index: false } };
export const dynamic = 'force-dynamic';

function Riche({ texte }: { texte: string }) {
  return <>{texte.split(/(<b>.*?<\/b>)/g).map((m, i) => (m.startsWith('<b>') ? <b key={i}>{m.slice(3, -4)}</b> : <span key={i}>{m}</span>))}</>;
}

export default async function PageAgent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const s = await sessionCourante();
  if (!s) redirect(`/connexion?suite=/agent/${code}`);
  const c = await commandeDeLAcheteur(code, s);
  if (!c) notFound();
  if (c.statut === 'PAYEE') redirect(`/achat/${code}`);
  const t = await getTranslations('agent');
  const numeros = await parametre('numeros_marchands');
  const disponibles = OPERATEURS.filter((o) => numeros[o.k] && normaliserTelephone(numeros[o.k]!));
  return (
    <main className="conteneur">
      <div className="achat pile" style={ecart(18)}>
        <section className="panneau pile" style={ecart(18)} aria-labelledby="t-agent">
          <h1 id="t-agent" className="affiche" style={{ fontSize: 'clamp(36px,6vw,52px)' }}>{t('titre')}</h1>
          {disponibles.length === 0 ? <p className="note note-attention">{t('aucunNumero')}</p> : (
            <>
              <div className="pile" style={ecart(8, { padding: 18, border: '2px solid var(--encre)', borderRadius: 18, boxShadow: '3px 3px 0 var(--ombre)' })}>
                <span className="doux" style={{ fontWeight: 700 }}>{t('code')}</span>
                <span className="montant">{c.code}</span>
                <span className="affiche" style={{ fontSize: 32 }}>{cdf(c.totalCdf)}</span>
              </div>
              <ol className="liste-num">
                {[t.raw('etape1') as string, t('etape2'), t('etape3')].map((g, i) => <li key={i}><span>{i + 1}</span><span><Riche texte={g.replace('{montant}', cdf(c.totalCdf))} /></span></li>)}
              </ol>
              <div className="pile" style={ecart(8)}>
                {disponibles.map((o) => (
                  <div key={o.k} className="rangee entre" style={{ padding: '12px 14px', borderRadius: 14, background: o.fond, color: o.texte }}>
                    <b>{t('numeroMarchand', { operateur: o.nom })}</b>
                    <b style={{ fontSize: 18, letterSpacing: '0.04em' }}>{formaterTelephone(normaliserTelephone(numeros[o.k]!)!)}</b>
                  </div>
                ))}
              </div>
              <FormAgent code={c.code} operateurs={disponibles} chiffres={chiffresNationaux(c.telephone)} textes={{ operateur: t('operateur'), reference: t('reference'), referenceAide: t('referenceAide'), numeroPayeur: t('numeroPayeur'), envoyer: t('envoyer'), placeholder: 'XX XXX XX XX' }} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
