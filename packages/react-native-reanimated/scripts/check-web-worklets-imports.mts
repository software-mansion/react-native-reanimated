import { build } from 'esbuild';
import type { Metafile } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKLETS_PACKAGE = 'react-native-worklets';
const WEB_RESOLVE_EXTENSIONS = [
  '.web.tsx',
  '.web.ts',
  '.web.js',
  '.tsx',
  '.ts',
  '.js',
];

await main();

async function main() {
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..'
  );
  const metafile = await bundleWebEntry(packageRoot);
  const offenders = findWorkletsImports(metafile);
  const moduleCount = Object.keys(metafile.inputs).length;

  if (offenders.length > 0) {
    process.stderr.write(
      `The web implementation imports ${WORKLETS_PACKAGE} at runtime. Use type-only imports, or move the code to a .native file:\n`
    );
    for (const { file, importPath } of offenders) {
      process.stderr.write(`  ${file} -> ${importPath}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(
    `No runtime ${WORKLETS_PACKAGE} imports in ${moduleCount} web modules.\n`
  );
}

async function bundleWebEntry(packageRoot: string) {
  const result = await build({
    absWorkingDir: packageRoot,
    entryPoints: ['src/index.ts'],
    bundle: true,
    write: false,
    metafile: true,
    platform: 'browser',
    format: 'esm',
    packages: 'external',
    resolveExtensions: WEB_RESOLVE_EXTENSIONS,
    define: { __DEV__: 'true' },
    ignoreAnnotations: true,
    logLevel: 'error',
  });
  return result.metafile;
}

function findWorkletsImports(metafile: Metafile) {
  return Object.entries(metafile.inputs).flatMap(([file, input]) =>
    input.imports
      .filter(({ path: importPath }) => isWorkletsImport(importPath))
      .map(({ path: importPath }) => ({ file, importPath }))
  );
}

function isWorkletsImport(importPath: string) {
  return (
    importPath === WORKLETS_PACKAGE ||
    importPath.startsWith(`${WORKLETS_PACKAGE}/`)
  );
}
