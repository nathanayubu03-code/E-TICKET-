import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { VueEvenement } from '@/components/evenement/VueEvenement';
import { evenementPublic } from '@/lib/evenements';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const e = await evenementPublic((await params).slug);
  return e ? { title: e.titre, description: e.sousTitre ?? e.description?.slice(0, 160) ?? undefined } : {};
}

export default async function PageEvenement({ params }: { params: Params }) {
  const e = await evenementPublic((await params).slug);
  if (!e) notFound();
  return <main className="conteneur"><VueEvenement e={e} /></main>;
}
