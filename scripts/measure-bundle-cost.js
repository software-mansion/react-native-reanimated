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
    attributions: false,
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
    } else if (a.startsWith('--attributions=')) {
      args.attributions = parseBool(
        a.slice('--attributions='.length),
        'attributions'
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

  if (args.attributions && !args.bundleMode) {
    fail(
      '--attributions=true requires --bundle-mode=true.\n' +
        'Worklets are only extracted into dedicated files (and thus only need ' +
        're-attribution) in bundle mode.'
    );
  }
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
  --attributions=<bool>      Credit generated worklets back to the library that
                             authored them instead of react-native-worklets
                             (default: false). Only valid with bundle mode on.
  --json                     Emit machine-readable JSON instead of a table.
  --keep                     Keep the generated bundle/source-map artifacts.
  -h, --help                 Show this help.

Valid combinations:
  --bundle-mode=true  --attributions=false   (default) worklets counted raw
  --bundle-mode=true  --attributions=true    worklets credited to their author
  --bundle-mode=false                        no bundle mode (plain tree-shaking)
  --bundle-mode=false --attributions=true    INVALID`
  );
}

const PATCH_FILES = [
  'fabric-example-metro-config.patch',
  'fabric-example-babel-config.patch',
].map((f) => path.join(MONOREPO_ROOT, 'scripts', 'patches', f));

function git(gitArgs) {
  return (
    spawnSync('git', gitArgs, { cwd: MONOREPO_ROOT, stdio: 'ignore' })
      .status === 0
  );
}

/** @returns {boolean} True if the bundle-mode patches are currently applied. */
function isBundleModeOn() {
  const applied = PATCH_FILES.every((p) =>
    git(['apply', '--reverse', '--check', p])
  );
  const reversed = PATCH_FILES.every((p) => git(['apply', '--check', p]));
  if (applied && !reversed) return true;
  if (reversed && !applied) return false;
  throw new Error(
    'bundle-mode patches are in a mixed/unknown state; fix ' +
      'apps/fabric-example/{metro,babel}.config.js manually and retry.'
  );
}

/**
 * Bring bundle mode to `on`.
 *
 * @param {boolean} on
 * @returns {boolean} Whether anything changed.
 */
function setBundleMode(on) {
  if (isBundleModeOn() === on) return false;
  const apply = on ? ['apply'] : ['apply', '--reverse'];
  const undo = on ? ['apply', '--reverse'] : ['apply'];
  const done = [];
  for (const p of PATCH_FILES) {
    if (git([...apply, p])) {
      done.push(p);
      continue;
    }
    for (const d of done.reverse()) git([...undo, d]);
    throw new Error('failed to toggle bundle-mode patches');
  }
  return true;
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

  const consumer = await new SourceMapConsumer(
    JSON.parse(fs.readFileSync(mapFile, 'utf8'))
  );

  /** @type {[number, number, string | null][]} */
  const mappings = [];
  consumer.eachMapping(
    (m) => mappings.push([m.generatedLine, m.generatedColumn, m.source]),
    null,
    SourceMapConsumer.GENERATED_ORDER
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

  if (typeof consumer.destroy === 'function') consumer.destroy();
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

  const originalBundleMode = isBundleModeOn();
  let toggled = false;

  const modeLabel = `bundle-mode=${args.bundleMode}, attributions=${args.attributions}`;
  console.error(`• ${modeLabel}`);

  /** @type {Record<string, any>} */
  const report = {};
  try {
    toggled = setBundleMode(args.bundleMode);
    for (const platform of args.platforms) {
      const { bundle, map } = buildBundle(platform, tmp, args.attributions);
      const { total, groups } = await attributeBundle(
        bundle,
        map,
        args.attributions
      );
      report[platform] = {
        total,
        gzip: gzipSize(fs.readFileSync(bundle)),
        groups,
      };
    }
  } finally {
    if (toggled) setBundleMode(originalBundleMode);
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
