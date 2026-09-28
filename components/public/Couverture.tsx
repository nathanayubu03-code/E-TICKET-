import { couvertureSVG } from '@/lib/kuba';

export interface Variantes { [format: string]: { avif?: string; webp?: string } }

/** Affiche téléversée si elle existe, sinon motif Kuba aux couleurs de la catégorie. */
export function Couverture({ id, fond, variantes, format, cols, rows, alt = '' }: {
  id: string; fond: string | null | undefined; variantes: unknown; format: '16x9' | '4x5'; cols?: number; rows?: number; alt?: string;
}) {
  const v = (variantes as Variantes | null)?.[format];
  if (v?.webp || v?.avif) {
    return (
      <picture>
        {v.avif ? <source srcSet={v.avif} type="image/avif" /> : null}
        <img src={v.webp ?? v.avif} alt={alt} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </picture>
    );
  }
  return <div className="couverture" style={{ position: 'absolute', inset: 0, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: couvertureSVG(id, fond, { cols, rows }) }} />;
}
