import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: ['node_modules/**', '.next/**', '.next-e2e/**', '.next-staging/**', 'generated/**', 'design/**', 'outils/**', 'tokens/**', 'public/sw.js', 'public/swe-worker-*.js', 'playwright-report/**', 'test-results/**', 'docs/**'],
  },
];
export default config;
