import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { SourceMapConsumer as UntypedSourceMapConsumer } from 'source-map';

type Mapping = [number, number, string | null];

interface MappingItem {
  generatedLine: number;
  generatedColumn: number;
  source: string | null;
}

interface Consumer {
  eachMapping(
    callback: (mapping: MappingItem) => void,
    context: unknown,
    order: number
  ): void;
  destroy?: () => void;
}

interface SourceMapConsumerConstructor {
  new (map: unknown): Consumer | Promise<Consumer>;
  GENERATED_ORDER: number;
}

const SourceMapConsumer =
  UntypedSourceMapConsumer as SourceMapConsumerConstructor;

interface RawSourceMap {
  sections?: {
    offset: { line: number; column: number };
    map: RawSourceMap;
  }[];
}

const MONOREPO_ROOT = path.resolve(import.meta.dirname, '..');
const FABRIC_APP = path.join(MONOREPO_ROOT, 'apps', 'fabric-example');

const GROUPS: { label: string; test: RegExp }[] = [
  {
    label: 'react-native-worklets',
    test: /(?:node_modules|packages)[/\\]react-native-worklets[/\\]/,
  },
  {
    label: 'react-native-reanimated',
    test: /(?:node_modules|packages)[/\\]react-native-reanimated[/\\]/,
  },
];

const WORKLETS_GEN = /[/\\]react-native-worklets[/\\]\.worklets[/\\]/;
const ORIGIN_RE = /^\/\/ __workletOrigin: (.*)$/m;
const originCache = new Map<string, string>();

function resolveWorkletOrigin(file: string, seen?: Set<string>): string {
  const cached = originCache.get(file);
  if (cached !== undefined) return cached;
  let origin = file;
  try {
    const match = fs.readFileSync(file, 'utf8').match(ORIGIN_RE);
    if (match) origin = match[1].trim();
  } catch {
    throw new Error(
      'worklet file was cleaned up while running the bundle analysis'
    );
  }
  if (origin !== file && WORKLETS_GEN.test(origin)) {
    seen = seen || new Set();
    if (!seen.has(origin)) {
      seen.add(origin);
      origin = resolveWorkletOrigin(origin, seen);
    }
  }
  originCache.set(file, origin);
  return origin;
}

function classify(source: string | null, attribute: boolean): string {
  if (!source) return 'other';
  const resolved =
    attribute && WORKLETS_GEN.test(source)
      ? resolveWorkletOrigin(source)
      : source;
  const group = GROUPS.find((g) => g.test.test(resolved));
  return group ? group.label : 'other';
}

function fail(message: string): never {
  throw new Error(message);
}

function parseBool(value: string, name: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(`--${name} expects true or false (got "${value}")`);
}

interface Args {
  platforms: string[];
  bundleMode: boolean;
  json: boolean;
  keep: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    platforms: [],
    bundleMode: true,
    json: false,
    keep: false,
    help: false,
  };
  for (const a of argv) {
    if (a === '--json') args.json = true;
    else if (a === '--keep') args.keep = true;
    else if (a === '-h' || a === '--help') {
      args.help = true;
      return args;
    } else if (a.startsWith('--bundle-mode=')) {
      args.bundleMode = parseBool(
        a.slice('--bundle-mode='.length),
        'bundle-mode'
      );
    } else if (a.startsWith('--platform=')) {
      args.platforms = a.slice('--platform='.length).split(',').filter(Boolean);
    } else if (!a.startsWith('-')) {
      args.platforms.push(a);
    } else {
      fail(`Unknown argument: ${a}\nRun with --help for usage.`);
    }
  }
  if (args.platforms.length === 0) args.platforms = ['ios'];
  return args;
}

function printHelp(): void {
  console.log(
    `Measure per-library bundle cost of the fabric example app.

Usage:
  node scripts/measure-bundle-cost.mts [options] [platforms...]

Options:
  --platform=<ios,android>   Platform(s) to bundle (default: ios). May also be
                             passed as positional args.
  --bundle-mode=<bool>       Build with worklets bundle mode on (default: true).
  --json                     Emit machine-readable JSON instead of a table.
  --keep                     Keep the generated bundle/source-map artifacts.
  -h, --help                 Show this help.`
  );
}

const TOGGLE_SCRIPT = path.join(
  MONOREPO_ROOT,
  'scripts',
  'toggle-bundle-mode.sh'
);

const BUNDLE_MODE_ASSIGN =
  /_WORKLETS_BUNDLE_MODE_ENABLED\s*=\s*(!0|!1|true|false)/g;

/** @returns Whether the built bundle has bundle mode enabled. */
function detectBundleMode(bundleFile: string): boolean {
  const matches = [
    ...fs.readFileSync(bundleFile, 'utf8').matchAll(BUNDLE_MODE_ASSIGN),
  ];
  if (matches.length === 0) {
    throw new Error(
      'could not find _WORKLETS_BUNDLE_MODE_ENABLED in the bundle; ' +
        'is react-native-worklets part of the app?'
    );
  }
  return matches.some((m) => m[1] === '!0' || m[1] === 'true');
}

function toggleBundleMode(): void {
  const res = spawnSync('bash', [TOGGLE_SCRIPT], {
    cwd: MONOREPO_ROOT,
    stdio: ['ignore', 2, 2],
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(
      `scripts/toggle-bundle-mode.sh failed with exit code ${res.status}`
    );
  }
}

/** Build a minified production bundle with a source map for `platform`. */
function buildBundle(
  platform: string,
  outDir: string,
  attribute: boolean
): { bundle: string; map: string } {
  const bundle = path.join(outDir, `${platform}.bundle.js`);
  const map = `${bundle}.map`;
  console.error(`• building ${platform} bundle…`);
  const res = spawnSync(
    'yarn',
    [
      'react-native',
      'bundle',
      '--entry-file',
      'App.tsx',
      '--platform',
      platform,
      '--bundle-output',
      bundle,
      '--sourcemap-output',
      map,
      '--dev=false',
      '--minify=true',
      '--reset-cache',
    ],
    {
      cwd: FABRIC_APP,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: attribute
        ? { ...process.env, WORKLETS_WRITE_ORIGIN: '1' }
        : process.env,
    }
  );
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(
      `react-native bundle (${platform}) failed with exit code ${res.status}`
    );
  }
  return { bundle, map };
}

/**
 * Build `platform` and make sure the result really is in the requested bundle
 * mode, toggling the repo once and rebuilding if it isn't.
 */
function buildInRequestedMode(
  platform: string,
  outDir: string,
  args: { bundleMode: boolean },
  state: { toggled: boolean }
): { bundle: string; map: string } {
  const built = buildBundle(platform, outDir, args.bundleMode);
  if (detectBundleMode(built.bundle) === args.bundleMode) return built;

  if (state.toggled) {
    throw new Error(
      'scripts/toggle-bundle-mode.sh ran but the bundle is still ' +
        `bundle-mode=${!args.bundleMode}`
    );
  }
  console.error(
    `• bundle came out bundle-mode=${!args.bundleMode}, toggling and rebuilding…`
  );
  toggleBundleMode();
  state.toggled = true;
  return buildInRequestedMode(platform, outDir, args, state);
}

/** Read every mapping of a flat source map. */
async function readFlatMappings(map: RawSourceMap): Promise<Mapping[]> {
  const consumer = await new SourceMapConsumer(map);
  const mappings: Mapping[] = [];
  consumer.eachMapping(
    (m) => mappings.push([m.generatedLine, m.generatedColumn, m.source]),
    null,
    SourceMapConsumer.GENERATED_ORDER
  );
  consumer.destroy?.();
  return mappings;
}

/** Read every mapping of a source map, in generated order. */
async function collectMappings(map: RawSourceMap): Promise<Mapping[]> {
  if (!map.sections) return readFlatMappings(map);

  const mappings: Mapping[] = [];
  for (const section of map.sections) {
    const { line, column } = section.offset;
    for (const [l, c, source] of await readFlatMappings(section.map)) {
      mappings.push([l + line, l === 1 ? c + column : c, source]);
    }
  }
  mappings.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return mappings;
}

async function attributeBundle(
  bundleFile: string,
  mapFile: string,
  attribute: boolean
): Promise<{ total: number; groups: Record<string, number> }> {
  const code: string = fs.readFileSync(bundleFile, 'utf8');
  const lines = code.split('\n');

  const lineStart = [0, 0];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    lineStart[i + 1] = offset;
    offset += Buffer.byteLength(lines[i], 'utf8') + 1; // +1 for the '\n'
  }
  const total = Buffer.byteLength(code, 'utf8');
  const byteOf = (line: number, column: number) =>
    lineStart[line] +
    Buffer.byteLength(lines[line - 1].slice(0, column), 'utf8');

  const mappings = await collectMappings(
    JSON.parse(fs.readFileSync(mapFile, 'utf8'))
  );

  const groups: Record<string, number> = { other: 0 };
  for (const g of GROUPS) groups[g.label] = 0;

  for (let i = 0; i < mappings.length; i++) {
    const [line, column, source] = mappings[i];
    const start = byteOf(line, column);
    const next = mappings[i + 1];
    const end = next ? byteOf(next[0], next[1]) : total;
    const size = Math.max(0, end - start);
    groups[classify(source, attribute)] += size;
  }

  return { total, groups };
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;
const pct = (n: number, total: number) =>
  `${total ? ((n / total) * 100).toFixed(1) : '0.0'}%`;
const gzipSize = (buf: Buffer) => zlib.gzipSync(buf, { level: 9 }).length;

interface Result {
  total: number;
  gzip: number;
  groups: Record<string, number>;
}

function printReport(title: string, result: Result): void {
  const { total, gzip, groups } = result;
  console.log(`\n${title}    total ${mb(total)} (${mb(gzip)} gzipped)`);
  const rows = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  for (const [label, size] of rows) {
    console.log(
      `  ${label.padEnd(26)} ${mb(size).padStart(9)}  ${pct(size, total).padStart(6)}`
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reanimated-bundle-cost-'));

  const state = { toggled: false };

  const modeLabel = `bundle-mode=${args.bundleMode}`;
  console.error(`• ${modeLabel}`);

  const report: Record<string, Result> = {};
  try {
    for (const platform of args.platforms) {
      const { bundle, map } = buildInRequestedMode(platform, tmp, args, state);
      const { total, groups } = await attributeBundle(
        bundle,
        map,
        args.bundleMode
      );
      report[platform] = {
        total,
        gzip: gzipSize(fs.readFileSync(bundle)),
        groups,
      };
    }
  } finally {
    if (state.toggled) toggleBundleMode();
    if (args.keep) console.error(`\nartifacts kept in ${tmp}`);
    else fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (args.json) {
    console.log(JSON.stringify({ mode: modeLabel, ...report }, null, 2));
  } else {
    for (const [title, result] of Object.entries(report)) {
      printReport(`${title}  [${modeLabel}]`, result);
    }
  }
}

main().catch((err: Error) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
