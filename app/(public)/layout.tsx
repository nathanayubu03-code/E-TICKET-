import { Entete } from '@/components/public/Entete';
import { PiedDePage } from '@/components/public/PiedDePage';

export default async function LayoutPublic({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Entete />
      {children}
      <PiedDePage villes={[]} />
    </>
  );
}
