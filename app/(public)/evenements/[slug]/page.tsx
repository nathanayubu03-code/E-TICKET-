import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VueEvenement } from '@/components/evenement/VueEvenement';
import { getLocale } from 'next-intl/server';
import { evenementPublic } from '@/lib/evenements';
import { texteEvenement } from '@/lib/langue';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const e = await evenementPublic((await params).slug);
  const langue = await getLocale();
  return e ? { title: texteEvenement(e, 'titre', langue), description: e.sousTitre ?? (texteEvenement(e, 'description', langue).slice(0, 160) || undefined) } : {};
}

export default async function PageEvenement({ params }: { params: Params }) {
  const e = await evenementPublic((await params).slug);
  if (!e) notFound();
  return <main className="conteneur"><VueEvenement e={e} /></main>;
}
