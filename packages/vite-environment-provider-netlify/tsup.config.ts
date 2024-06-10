import { defineConfig } from 'tsup';

const buildPluginConfig = defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  dts: true,
  format: ['esm'],
  platform: 'node',
  external: [
    '@cspotcode/source-map-support',
    'lightningcss',
    'esbuild',
    'vite',
    '@mapbox/node-pre-gyp',
  ],
  banner: {
    js: `
    import {createRequire as ___createRequire} from "module";
    let require=___createRequire(import.meta.url);
    `,
  },
});

const buildDenoConfig = defineConfig({
  entry: ['src/deno/index.ts'],
  outDir: 'dist/deno',
  format: ['esm'],
  platform: 'browser',
  noExternal: [/.*/],
});

export default [buildPluginConfig, buildDenoConfig];
