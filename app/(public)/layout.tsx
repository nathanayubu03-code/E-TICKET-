import { Entete } from '@/components/public/Entete';
import { PiedDePage } from '@/components/public/PiedDePage';
import { villesEtCategoriesPubliques } from '@/lib/evenements';

export default async function LayoutPublic({ children }: { children: React.ReactNode }) {
  const { villes } = await villesEtCategoriesPubliques();
  return (
    <>
      <Entete />
      {children}
      <PiedDePage villes={villes.map((v) => v.nom)} />
    </>
  );
}
