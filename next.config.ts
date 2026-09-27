import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: false,
  serverExternalPackages: ['@node-rs/argon2', 'sharp', 'exceljs', 'pdf-lib'],
};

export default withNextIntl(nextConfig);
