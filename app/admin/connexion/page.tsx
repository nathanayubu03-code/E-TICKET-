import type { Metadata } from 'next';
import { Logo } from '@/components/public/Logo';
import { ecart } from '@/lib/style';
import { FormConnexionAdmin } from './FormConnexionAdmin';

export const metadata: Metadata = { title: 'Connexion administration', robots: { index: false } };

export default async function ConnexionAdmin({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite = '' } = await searchParams;
  return (
    <main className="conteneur" style={{ maxWidth: 520 }}>
      <div className="pile" style={ecart(20)}>
        <Logo />
        <section className="panneau pile" style={ecart(16)} aria-labelledby="t-cx">
          <h1 id="t-cx" className="affiche" style={{ fontSize: 44 }}>Administration</h1>
          <p className="doux">Mot de passe, puis code reçu par SMS.</p>
          <FormConnexionAdmin suite={suite} />
        </section>
      </div>
    </main>
  );
}
