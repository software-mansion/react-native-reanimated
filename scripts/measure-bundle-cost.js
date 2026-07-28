const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');
const { SourceMapConsumer } = require('source-map');

const MONOREPO_ROOT = path.resolve(__dirname, '..');
const FABRIC_APP = path.join(MONOREPO_ROOT, 'apps', 'fabric-example');

/** @type {{ label: string; test: RegExp }[]} * */
const GROUPS = [
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
/** @type {Map<string, string>} */
const originCache = new Map();

function resolveWorkletOrigin(file, seen) {
  if (originCache.has(file)) return originCache.get(file);
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

function classify(source, attribute) {
  if (!source) return 'other';
  const resolved =
    attribute && WORKLETS_GEN.test(source)
      ? resolveWorkletOrigin(source)
      : source;
  const group = GROUPS.find((g) => g.test.test(resolved));
  return group ? group.label : 'other';
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseBool(value, name) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(`--${name} expects true or false (got "${value}")`);
  return false; // unreachable
}

function parseArgs(argv) {
  const args = {
    platforms: [],
    bundleMode: true,
    json: false,
    keep: false,
  };
  for (const a of argv) {
    if (a === '--json') args.json = true;
    else if (a === '--keep') args.keep = true;
    else if (a === '-h' || a === '--help') {
      printHelp();
      process.exit(0);
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

function printHelp() {
  console.log(
    `Measure per-library bundle cost of the fabric example app.

Usage:
  node scripts/measure-bundle-cost.js [options] [platforms...]

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

/**
 * @param {string} bundleFile
 * @returns {boolean} Whether the built bundle has bundle mode enabled.
 */
function detectBundleMode(bundleFile) {
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

function toggleBundleMode() {
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

/**
 * Build a minified production bundle with a source map for `platform`.
 *
 * @param {string} platform
 * @param {string} outDir
 * @param {boolean} attribute
 * @returns {{ bundle: string; map: string }}
 */
function buildBundle(platform, outDir, attribute) {
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
 *
 * @param {string} platform
 * @param {string} outDir
 * @param {{ bundleMode: boolean }} args
 * @param {{ toggled: boolean }} state
 * @returns {{ bundle: string; map: string }}
 */
function buildInRequestedMode(platform, outDir, args, state) {
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

/**
 * Read every mapping of a flat source map as `[line, column, source]`.
 *
 * @param {any} map
 * @returns {Promise<[number, number, string | null][]>}
 */
async function readFlatMappings(map) {
  const consumer = await new SourceMapConsumer(map);
  /** @type {[number, number, string | null][]} */
  const mappings = [];
  consumer.eachMapping(
    (m) => mappings.push([m.generatedLine, m.generatedColumn, m.source]),
    null,
    SourceMapConsumer.GENERATED_ORDER
  );
  if (typeof consumer.destroy === 'function') consumer.destroy();
  return mappings;
}

/**
 * Read every mapping of a source map, in generated order.
 * @param {any} map
 * @returns {Promise<[number, number, string | null][]>}
 */
async function collectMappings(map) {
  if (!map.sections) return readFlatMappings(map);

  /** @type {[number, number, string | null][]} */
  const mappings = [];
  for (const section of map.sections) {
    const { line, column } = section.offset;
    for (const [l, c, source] of await readFlatMappings(section.map)) {
      mappings.push([l + line, l === 1 ? c + column : c, source]);
    }
  }
  mappings.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return mappings;
}

async function attributeBundle(bundleFile, mapFile, attribute) {
  const code = fs.readFileSync(bundleFile, 'utf8');
  const lines = code.split('\n');

  const lineStart = [0, 0];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    lineStart[i + 1] = offset;
    offset += Buffer.byteLength(lines[i], 'utf8') + 1; // +1 for the '\n'
  }
  const total = Buffer.byteLength(code, 'utf8');
  const byteOf = (line, column) =>
    lineStart[line] +
    Buffer.byteLength(lines[line - 1].slice(0, column), 'utf8');

  const mappings = await collectMappings(
    JSON.parse(fs.readFileSync(mapFile, 'utf8'))
  );

  /** @type {Record<string, number>} */
  const groups = { other: 0 };
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

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
const pct = (n, total) => `${total ? ((n / total) * 100).toFixed(1) : '0.0'}%`;
const gzipSize = (buf) => zlib.gzipSync(buf, { level: 9 }).length;

function printReport(title, result) {
  const { total, gzip, groups } = result;
  console.log(`\n${title}    total ${mb(total)} (${mb(gzip)} gzipped)`);
  const rows = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  for (const [label, size] of rows) {
    console.log(
      `  ${label.padEnd(26)} ${mb(size).padStart(9)}  ${pct(size, total).padStart(6)}`
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reanimated-bundle-cost-'));

  const state = { toggled: false };

  const modeLabel = `bundle-mode=${args.bundleMode}`;
  console.error(`• ${modeLabel}`);

  /** @type {Record<string, any>} */
  const report = {};
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

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
