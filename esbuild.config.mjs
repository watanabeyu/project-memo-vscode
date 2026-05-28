import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const shared = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
};

const configs = [
  {
    ...shared,
    entryPoints: ['src/extension.ts'],
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    outfile: 'dist/extension.js',
    external: ['vscode'],
  },
  {
    ...shared,
    entryPoints: ['src/webview/settings.mts'],
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outfile: 'dist/webview/settings.js',
  },
];

const contexts = await Promise.all(configs.map((c) => esbuild.context(c)));

if (watch) {
  await Promise.all(contexts.map((ctx) => ctx.watch()));
} else {
  await Promise.all(contexts.map((ctx) => ctx.rebuild()));
  await Promise.all(contexts.map((ctx) => ctx.dispose()));
}
