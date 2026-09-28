import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '@/lib/env';

// Stockage des fichiers (affiches). Disque local en développement, S3 compatible (Cloudflare R2) en production.
export interface Stockage {
  deposer(cle: string, contenu: Buffer, type: string): Promise<void>;
  lire(cle: string): Promise<Buffer | null>;
  supprimer(cle: string): Promise<void>;
  url(cle: string): string;
}

const cleSure = (cle: string) => {
  const n = normalize(cle).replace(/^(\.\.[/\\])+/, '');
  if (n.startsWith('/') || n.includes('..')) throw new Error('Clé de stockage invalide');
  return n;
};

class StockageLocal implements Stockage {
  constructor(private racine: string) {}
  async deposer(cle: string, contenu: Buffer) {
    const chemin = join(this.racine, cleSure(cle));
    await mkdir(dirname(chemin), { recursive: true });
    await writeFile(chemin, contenu);
  }
  async lire(cle: string) {
    try { return await readFile(join(this.racine, cleSure(cle))); } catch { return null; }
  }
  async supprimer() { /* conservé en local */ }
  url(cle: string) { return `/api/fichiers/${cleSure(cle)}`; }
}

class StockageS3 implements Stockage {
  private client: S3Client;
  constructor(private bucket: string, endpoint: string, region: string, accessKeyId: string, secretAccessKey: string, private publique: string | undefined) {
    this.client = new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey } });
  }
  async deposer(cle: string, contenu: Buffer, type: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: cleSure(cle), Body: contenu, ContentType: type, CacheControl: 'public, max-age=31536000, immutable' }));
  }
  async lire() { return null; }
  async supprimer(cle: string) { await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: cleSure(cle) })); }
  url(cle: string) { return this.publique ? `${this.publique.replace(/\/$/, '')}/${cleSure(cle)}` : `/api/fichiers/${cleSure(cle)}`; }
}

let instance: Stockage | null = null;
export function stockage(): Stockage {
  if (instance) return instance;
  const e = env();
  instance = e.STORAGE_DRIVER === 's3'
    ? new StockageS3(e.S3_BUCKET ?? '', e.S3_ENDPOINT ?? '', e.S3_REGION, e.S3_ACCESS_KEY_ID ?? '', e.S3_SECRET_ACCESS_KEY ?? '', e.S3_PUBLIC_URL)
    : new StockageLocal(e.STORAGE_LOCAL_DIR);
  return instance;
}
