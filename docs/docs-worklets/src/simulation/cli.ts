import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { formatLogs, formatTrace, simulate } from './index';
import type { SnippetModule } from './types';

main();

function main(): void {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith('--'));
  if (file === undefined) {
    console.error(
      'usage: node -r esbuild-register src/simulation/cli.ts <snippet.js> [--verbose] [--bundle-mode]'
    );
    process.exit(2);
  }
  const path = resolve(file);
  const source = readFileSync(path, 'utf8');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require(path) as SnippetModule;
  const snapshots = simulate(module, source, {
    bundleMode: args.includes('--bundle-mode'),
  });
  console.log(
    formatTrace(snapshots, { verbose: args.includes('--verbose') }).join('\n')
  );
  console.log(`finished at t${snapshots[snapshots.length - 1].tick}`);
  console.log('');
  console.log('console output:');
  console.log(formatLogs(snapshots).join('\n'));
}
