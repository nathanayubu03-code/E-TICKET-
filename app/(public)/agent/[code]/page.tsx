import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { FormAgent } from '@/components/achat/FormAgent';
import { commandeDeLAcheteur } from '@/lib/achat';
import Link from 'next/link';
import { estDevise, montant as formater } from '@/lib/argent';
import { montantsPossibles } from '@/lib/commandes';
import { sessionCourante } from '@/lib/auth/session';
import { OPERATEURS } from '@/lib/operateurs';
import { parametre } from '@/lib/parametres';
import { ecart } from '@/lib/style';
import { chiffresNationaux, formaterTelephone, normaliserTelephone } from '@/lib/telephone';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations('pages'))('agent'), robots: { index: false } };
}
export const dynamic = 'force-dynamic';

function Riche({ texte }: { texte: string }) {
  return <>{texte.split(/(<b>.*?<\/b>)/g).map((m, i) => (m.startsWith('<b>') ? <b key={i}>{m.slice(3, -4)}</b> : <span key={i}>{m}</span>))}</>;
}

export default async function PageAgent({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ devise?: string }> }) {
  const { code } = await params;
  const demandee = (await searchParams).devise;
  const s = await sessionCourante();
  if (!s) redirect(`/connexion?suite=/agent/${code}`);
  const c = await commandeDeLAcheteur(code, s);
  if (!c) notFound();
  if (c.statut === 'PAYEE') redirect(`/achat/${code}`);
  const t = await getTranslations('agent');
  const langue = await getLocale();
  const ta = await getTranslations('achat');
  const [possibles, numerosCdf, numerosUsd] = await Promise.all([montantsPossibles(c.id), parametre('numeros_marchands'), parametre('numeros_marchands_usd')]);
  // Devise : celle demandée par le lien (écran de paiement), sinon celle de la commande ; USD seulement si chaque catégorie a un prix USD.
  const voulue = estDevise(demandee) ? demandee : c.devise;
  const devise = voulue === 'USD' && possibles?.USD ? 'USD' : 'CDF';
  const attendu = devise === 'USD' ? possibles!.USD! : possibles!.CDF;
  const aPayer = formater(attendu.total, devise, langue);
  // Le numéro marchand peut différer selon la devise (deux réglages dans l'administration).
  const numeros = devise === 'USD' ? numerosUsd : numerosCdf;
  const disponibles = OPERATEURS.filter((o) => o.devises.includes(devise) && numeros[o.k] && normaliserTelephone(numeros[o.k]!));
  return (
    <main className="conteneur">
      <div className="achat pile" style={ecart(18)}>
        <section className="panneau pile" style={ecart(18)} aria-labelledby="t-agent">
          <h1 id="t-agent" className="affiche" style={{ fontSize: 'var(--t-titre-page)' }}>{t('titre')}</h1>
          {possibles?.USD ? (
            <div className="choix-devise" role="group" aria-label={ta('choisirDevise')}>
              {(['CDF', 'USD'] as const).map((d) => (
                <Link key={d} className="devise" aria-current={devise === d ? 'true' : undefined} href={`/agent/${c.code}?devise=${d}`} replace scroll={false}>
                  <b>{d === 'CDF' ? ta('payerEnCdf') : ta('payerEnUsd')}</b>
                  <span>{formater((d === 'USD' ? possibles.USD! : possibles.CDF).total, d, langue)}</span>
                </Link>
              ))}
            </div>
          ) : null}
          {disponibles.length === 0 ? <p className="note note-attention">{t('aucunNumero')}</p> : (
            <>
              <div className="pile" style={ecart(8, { padding: 18, border: '2px solid var(--encre)', borderRadius: 18, boxShadow: '3px 3px 0 var(--ombre)' })}>
                <span className="doux" style={{ fontWeight: 700 }}>{t('code')}</span>
                <span className="montant">{c.code}</span>
                <span className="affiche" style={{ fontSize: 'var(--t-montant)' }} data-devise={devise}>{aPayer}</span>
              </div>
              <ol className="liste-num">
                {[t.raw('etape1') as string, t('etape2'), t('etape3')].map((g, i) => <li key={i}><span>{i + 1}</span><span><Riche texte={g.replace('{montant}', aPayer)} /></span></li>)}
              </ol>
              <div className="pile" style={ecart(8)}>
                {disponibles.map((o) => (
                  <div key={o.k} className="rangee entre" style={{ padding: '12px 14px', borderRadius: 14, background: o.fond, color: o.texte }}>
                    <b>{t('numeroMarchand', { operateur: o.nom })}</b>
                    <b style={{ fontSize: 'var(--t-chapo)', letterSpacing: '0.04em' }}>{formaterTelephone(normaliserTelephone(numeros[o.k]!)!)}</b>
                  </div>
                ))}
              </div>
              <FormAgent code={c.code} devise={devise} operateurs={disponibles} chiffres={chiffresNationaux(c.telephone)} textes={{ operateur: t('operateur'), reference: t('reference'), referenceAide: t('referenceAide'), numeroPayeur: t('numeroPayeur'), envoyer: t('envoyer'), placeholder: 'XX XXX XX XX' }} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
