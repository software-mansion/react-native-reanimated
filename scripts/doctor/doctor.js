'use strict';

/*
 * reanimated-doctor — checks that host tools NOT installed by `yarn install`
 * (clang-format, clang-tidy, cmake, ruby, cocoapods, the NDK, ...) match the
 * versions this repo expects. Required versions are DERIVED from the canonical
 * files that already pin them (.nvmrc, package.json, Gemfile.lock,
 * Podfile.lock, build.gradle) so there is nothing to duplicate or forget.
 *
 * Default mode is advisory: it reports and exits 0. Pass --ci to make
 * `error`-severity findings fail the process.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const NODE_BIN = path.join(ROOT, 'node_modules', '.bin');
const CI = process.argv.includes('--ci');
const isMac = process.platform === 'darwin';

const C = process.stdout.isTTY
  ? {
      red: (s) => `\x1b[31m${s}\x1b[0m`,
      yellow: (s) => `\x1b[33m${s}\x1b[0m`,
      green: (s) => `\x1b[32m${s}\x1b[0m`,
      dim: (s) => `\x1b[2m${s}\x1b[0m`,
      bold: (s) => `\x1b[1m${s}\x1b[0m`,
    }
  : new Proxy({}, { get: () => (s) => s });

/** @param {string} file @returns {string | null} */
function read(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
  } catch {
    return null;
  }
}

/**
 * Lists checked-in files under `rel` matching `filter`, skipping vendored and
 * build directories so node_modules' RN-managed copies don't pollute results.
 * @param {string} rel
 * @param {(f: string) => boolean} filter
 * @param {string[]} [out]
 * @param {number} [depth]
 * @returns {string[]}
 */
function walk(rel, filter, out = [], depth = 0) {
  const SKIP = new Set(['node_modules', 'vendor', 'build', '.git', '.cxx', 'Pods', '.yarn']);
  let entries;
  try {
    entries = fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const child = path.join(rel, e.name);
    if (e.isDirectory()) {
      if (depth < 6) walk(child, filter, out, depth + 1);
    } else if (filter(child)) {
      out.push(child);
    }
  }
  return out;
}

/** @param {string} bin @returns {boolean} */
function onPath(bin) {
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    try {
      fs.accessSync(path.join(dir, bin), fs.constants.X_OK);
      return true;
    } catch {
      // not here; keep looking
    }
  }
  return false;
}

/**
 * Runs a command and returns its combined output, optionally with the repo's
 * node_modules/.bin stripped from PATH so we see the binary an editor or a
 * plain shell would resolve — not the npm-pinned shim that yarn injects.
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ excludeNodeBin?: boolean, cwd?: string }} [opts]
 */
function probe(cmd, args, opts = {}) {
  const env = { ...process.env };
  if (opts.excludeNodeBin) {
    env.PATH = (env.PATH || '')
      .split(path.delimiter)
      .filter((p) => path.resolve(p) !== NODE_BIN)
      .join(path.delimiter);
  }
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    env,
    cwd: opts.cwd ? path.join(ROOT, opts.cwd) : ROOT,
  });
  if (res.error) {
    return { found: false, out: '', stdout: '' };
  }
  return { found: true, out: `${res.stdout || ''}${res.stderr || ''}`.trim(), stdout: (res.stdout || '').trim() };
}

/** @param {string | null} str @returns {{ raw: string, major: number, minor: number, patch: number } | null} */
function parseVersion(str) {
  const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(str || '');
  if (!m) {
    return null;
  }
  return { raw: m[0], major: +m[1], minor: +m[2], patch: +(m[3] || 0) };
}

/** @typedef {{ name: string, status: string, severity: string, required: string, found: string, source: string, hint?: string, note?: string }} Finding */

/** @type {Finding[]} */
const findings = [];

/** @param {Finding} f */
function add(f) {
  findings.push(f);
}

// ---------------------------------------------------------------------------
// Checks. Each derives its requirement from a canonical file, then compares.
// ---------------------------------------------------------------------------

function checkNode() {
  const want = (read('.nvmrc') || '').trim();
  const wantV = parseVersion(want);
  if (!wantV) {
    return add({ name: 'node', status: 'INFO', severity: 'info', required: want || '(unset)', found: '—', source: '.nvmrc', note: 'Could not parse a version from .nvmrc.' });
  }
  const { found, out } = probe('node', ['--version']);
  const gotV = parseVersion(out);
  if (!found || !gotV) {
    return add({ name: 'node', status: 'MISSING', severity: 'error', required: want, found: '—', source: '.nvmrc', hint: 'nvm install (reads .nvmrc), or: fnm use' });
  }
  let status = 'OK';
  if (gotV.major !== wantV.major) status = 'WRONG';
  else if (gotV.minor !== wantV.minor) status = 'WARN';
  add({ name: 'node', status, severity: status === 'WRONG' ? 'error' : 'warn', required: `${want}.x`, found: gotV.raw, source: '.nvmrc', hint: 'nvm install (reads .nvmrc)' });
}

function checkYarn() {
  const pm = JSON.parse(read('package.json') || '{}').packageManager || '';
  const want = pm.split('@')[1] || '';
  const { found, out } = probe('yarn', ['--version']);
  const got = (out.match(/\d+\.\d+\.\d+/) || [''])[0];
  if (!found || !got) {
    return add({ name: 'yarn', status: 'MISSING', severity: 'error', required: want, found: '—', source: 'package.json#packageManager', hint: 'corepack enable && corepack prepare yarn@' + want + ' --activate' });
  }
  add({ name: 'yarn', status: got === want ? 'OK' : 'WRONG', severity: 'error', required: want, found: got, source: 'package.json#packageManager', hint: 'corepack prepare yarn@' + want + ' --activate' });
}

function checkClangFormat() {
  // The repo pins clang-format via the clang-format-node npm package; yarn's
  // format:* scripts resolve to node_modules/.bin. The drift is when a human
  // shell or an editor's format-on-save uses a DIFFERENT clang-format on PATH.
  const pinned = parseVersion(probe(path.join(NODE_BIN, 'clang-format'), ['--version']).out);
  const onPath = probe('clang-format', ['--version'], { excludeNodeBin: true });
  const pathV = parseVersion(onPath.out);
  const source = 'node_modules/.bin/clang-format (clang-format-node)';
  if (!pinned) {
    return add({ name: 'clang-format', status: 'MISSING', severity: 'warn', required: '(pinned binary)', found: '—', source, hint: 'yarn install — the pinned binary is missing' });
  }
  if (!onPath.found || !pathV) {
    return add({ name: 'clang-format (PATH)', status: 'INFO', severity: 'info', required: pinned.raw, found: 'not on PATH', source, note: 'No clang-format on PATH. yarn format:* still works via the pinned binary; an editor formatting on save would have none.' });
  }
  const drift = pathV.major !== pinned.major || pathV.minor !== pinned.minor;
  add({ name: 'clang-format (PATH)', status: drift ? 'DRIFT' : 'OK', severity: 'warn', required: pinned.raw, found: pathV.raw, source, note: drift ? 'Your shell/editor clang-format differs from the pinned one. Formatting a file outside `yarn format:*` will produce diffs CI rejects.' : undefined, hint: drift ? 'Use `yarn format:apple` (pinned), or install matching LLVM, or point your editor at node_modules/.bin/clang-format' : undefined });
}

function checkClangTidy() {
  // Genuinely unpinned: iOS uses homebrew LLVM, Android uses the NDK's binary.
  const { found, out } = probe('clang-tidy', ['--version']);
  const v = parseVersion(out);
  add({ name: 'clang-tidy', status: 'INFO', severity: 'info', required: 'unpinned (iOS: LLVM, Android: NDK)', found: found && v ? v.raw : 'not on PATH', source: 'scripts/llvm-tools', note: 'No version pin exists. iOS-LLVM and NDK clang-tidy report different findings; a different major than CI changes which checks fire.' });
}

function checkRuby() {
  if (!isMac) return;
  const base = (s) => (s || '').replace(/p\d+$/, '').trim();
  // Gemfile.lock records the ruby that actually locked the gems and that CI
  // runs — the authoritative version. (.ruby-version disagrees; see the
  // consistency pass, which surfaces all the conflicting sources.)
  const lock = read('apps/fabric-example/Gemfile.lock') || '';
  const lockRuby = (lock.match(/RUBY VERSION\s+ruby\s+(\S+)/) || [])[1] || '';
  const want = base(lockRuby);
  const { found, out } = probe('ruby', ['--version']);
  const got = (out.match(/ruby (\d+\.\d+\.\d+)/) || [])[1] || '';
  const source = 'apps/fabric-example/Gemfile.lock (RUBY VERSION)';
  if (!found || !got) {
    return add({ name: 'ruby', status: 'INFO', severity: 'info', required: lockRuby, found: 'not installed', source, note: 'Only needed for iOS pod work.' });
  }
  const ok = base(got) === want;
  add({ name: 'ruby', status: ok ? 'OK' : 'WARN', severity: 'warn', required: lockRuby, found: got, source, hint: ok ? undefined : `install ruby ${want} via your version manager (rbenv/asdf/rvm) — matches Gemfile.lock + CI` });
}

function checkCocoapods() {
  if (!isMac) return;
  const lock = read('apps/fabric-example/ios/Podfile.lock') || '';
  const want = (lock.match(/COCOAPODS:\s*(\S+)/i) || [])[1] || '';
  // The repo always runs the bundler-pinned pod (`bundle exec pod`), never a
  // global one — so check that, not whatever `pod` happens to be on PATH.
  // Parse the version from stdout only; bundler/ruby warnings land on stderr.
  const { found, stdout } = probe('bundle', ['exec', 'pod', '--version'], { cwd: 'apps/fabric-example' });
  const got = (stdout.match(/\d+\.\d+\.\d+/) || [''])[0];
  const source = 'apps/fabric-example/ios/Podfile.lock (via bundle exec pod)';
  if (!found || !got) {
    return add({ name: 'cocoapods', status: 'INFO', severity: 'info', required: want, found: 'not resolvable', source, note: 'Checked via `bundle exec pod` (the pod the repo uses). Run `bundle install` in apps/fabric-example.' });
  }
  add({ name: 'cocoapods', status: got === want ? 'OK' : 'WARN', severity: 'warn', required: want, found: got, source, note: 'Checked via `bundle exec pod`, not a global pod.', hint: got === want ? undefined : 'bundle install (from apps/fabric-example)' });
}

function checkCmake() {
  const floor =
    (read('packages/react-native-reanimated/android/CMakeLists.txt') || '').match(/cmake_minimum_required\(\s*VERSION\s+([\d.]+)/i)?.[1] ||
    '3.16';
  const floorV = parseVersion(floor);
  const { found, out } = probe('cmake', ['--version']);
  const v = parseVersion(out);
  if (!found || !v) {
    return add({ name: 'cmake', status: 'INFO', severity: 'info', required: `>=${floor}`, found: 'not on PATH', source: 'android/CMakeLists.txt', note: 'Usually provided by the Android SDK; only needed for local Android C++ builds.' });
  }
  const ok = v.major > floorV.major || (v.major === floorV.major && v.minor >= floorV.minor);
  add({ name: 'cmake', status: ok ? 'OK' : 'WARN', severity: 'warn', required: `>=${floor}`, found: v.raw, source: 'android/CMakeLists.txt', hint: ok ? undefined : 'brew install cmake (or use the SDK-bundled one)' });
}

function checkClangd() {
  const { found, out } = probe('clangd', ['--version']);
  const v = parseVersion(out);
  add({ name: 'clangd', status: 'INFO', severity: 'info', required: 'unpinned (LLVM)', found: found && v ? v.raw : 'not on PATH', source: '.clangd', note: 'Drives in-editor C++ diagnostics; whichever clangd is on PATH is used, so editor warnings can differ from CI.' });
}

function checkCmakeLang() {
  // cmake-format and cmake-lint both ship in the cmakelang pip package; CI pins it.
  const action = read('.github/actions/android-validation/action.yml') || '';
  const want = (action.match(/cmakelang==([\d.]+)/) || [])[1] || '';
  const fmt = probe('cmake-format', ['--version']);
  const lint = probe('cmake-lint', ['--version']);
  const source = `.github/actions/android-validation/action.yml (cmakelang==${want})`;
  if (!fmt.found && !lint.found) {
    return add({ name: 'cmake-format / cmake-lint', status: 'INFO', severity: 'info', required: want, found: 'not installed', source, note: 'From the cmakelang pip package; only needed to format/lint CMakeLists.', hint: `pip install cmakelang==${want}` });
  }
  if (!fmt.found || !lint.found) {
    const missing = fmt.found ? 'cmake-lint' : 'cmake-format';
    return add({ name: 'cmake-format / cmake-lint', status: 'WARN', severity: 'warn', required: want, found: `${missing} missing`, source, note: 'Both ship in the cmakelang package and must be installed together.', hint: `pip install cmakelang==${want}` });
  }
  // Check BOTH binaries — they can drift apart, and the failing one matters.
  const fmtV = parseVersion(fmt.stdout) || parseVersion(fmt.out);
  const lintV = parseVersion(lint.stdout) || parseVersion(lint.out);
  const ok = !!fmtV && !!lintV && fmtV.raw === want && lintV.raw === want;
  const found = ok ? want : `cmake-format ${fmtV ? fmtV.raw : '?'}, cmake-lint ${lintV ? lintV.raw : '?'}`;
  add({ name: 'cmake-format / cmake-lint', status: ok ? 'OK' : 'WARN', severity: 'warn', required: want, found, source, hint: ok ? undefined : `pip install cmakelang==${want} (both binaries must match CI)` });
}

function checkJdk() {
  const ci = read('.github/actions/android-validation/action.yml') || '';
  const want = (ci.match(/java-version:\s*'?(\d+)/) || [])[1] || '17';
  const { found, out } = probe('java', ['-version']);
  const v = parseVersion((out.match(/version "(\d[^"]*)"/) || [])[1] || out);
  if (!found || !v) {
    return add({ name: 'java (JDK)', status: 'INFO', severity: 'info', required: want, found: 'not on PATH', source: '.github/actions/android-validation/action.yml', note: 'Only needed for local Android builds.' });
  }
  const ok = v.major === +want;
  add({ name: 'java (JDK)', status: ok ? 'OK' : 'WARN', severity: 'warn', required: `${want} (major)`, found: String(v.major), source: 'CI setup-java (android-validation)', hint: ok ? undefined : `Install a JDK ${want} (CI uses Zulu ${want}); a different major breaks AGP/Gradle locally.` });
}

function checkXcodeBuildServer() {
  if (!isMac) return;
  const present = onPath('xcode-build-server');
  add({ name: 'xcode-build-server', status: present ? 'OK' : 'INFO', severity: 'info', required: 'any (unpinned)', found: present ? 'installed' : 'not installed', source: 'scripts/llvm-tools/generate-xcode-metadata.sh', note: present ? 'No version is pinned; CI uses whatever brew installs.' : 'Needed to build the iOS clang-tidy compile database.', hint: present ? undefined : 'brew install xcode-build-server' });
}

function checkNdk() {
  const gradle = read('apps/fabric-example/android/build.gradle') || '';
  const want = (gradle.match(/ndkVersion\s*=\s*"([^"]+)"/) || [])[1] || '';
  add({ name: 'NDK', status: 'INFO', severity: 'info', required: want, found: '(pinned in build.gradle)', source: 'apps/fabric-example/android/build.gradle', note: 'Already structurally validated by the android-validation workflow; shown here for reference (PCH formats differ across NDK majors).' });
}

// ---------------------------------------------------------------------------
// Cross-file consistency — canonical sources that should agree but don't.
// ---------------------------------------------------------------------------

/** @typedef {{ name: string, detail: string, items: string[] }} Conflict */

/** @type {Conflict[]} */
const conflicts = [];

/** @param {string} globEnd @param {string[]} dirs @param {RegExp} re @returns {Record<string, string[]>} */
function groupVersions(globEnd, dirs, re) {
  const byVer = {};
  for (const dir of dirs) {
    for (const f of walk(dir, (p) => p.endsWith(globEnd))) {
      const m = (read(f) || '').match(re);
      if (m) (byVer[m[1]] || (byVer[m[1]] = [])).push(f);
    }
  }
  return byVer;
}

function consistencyGradle() {
  // Gradle wrappers live in BOTH apps and packages (each native lib ships its own).
  const byVer = groupVersions('gradle/wrapper/gradle-wrapper.properties', ['apps', 'packages'], /gradle-(\d+\.\d+(?:\.\d+)?)-/);
  const versions = Object.keys(byVer);
  if (versions.length > 1) {
    conflicts.push({ name: 'Gradle wrapper', detail: `${versions.length} versions across the repo`, items: versions.map((v) => `${v} — ${byVer[v].join(', ')}`) });
  }
}

function consistencySpotless() {
  const byVer = groupVersions('android/build.gradle.kts', ['packages'], /com\.diffplug\.spotless"\)\s*version\s*"([\d.]+)"/);
  const versions = Object.keys(byVer);
  if (versions.length > 1) {
    conflicts.push({ name: 'Spotless plugin', detail: `${versions.join(' vs ')} across packages`, items: versions.map((v) => `${v} — ${byVer[v].join(', ')}`) });
  }
}

function consistencyJavaCI() {
  const byVer = {};
  for (const f of walk('.github', (p) => p.endsWith('.yml') || p.endsWith('.yaml'))) {
    const text = read(f) || '';
    const re = /java-version:\s*'?(\d+)/g;
    let m;
    while ((m = re.exec(text))) (byVer[m[1]] || (byVer[m[1]] = new Set())).add(f);
  }
  const versions = Object.keys(byVer);
  if (versions.length > 1) {
    conflicts.push({ name: 'CI Java version', detail: `JDK ${versions.join(' vs ')} across workflows (18 is used by some nightly RN-compat jobs — confirm intended)`, items: versions.map((v) => `${v} — ${byVer[v].size} file(s)`) });
  }
}

function consistencyRuby() {
  const base = (s) => (s || '').replace(/p\d+$/, '').trim();
  const sources = [];
  const rv = (read('.ruby-version') || '').trim();
  if (rv) sources.push(['.ruby-version', rv]);
  const lockRuby = ((read('apps/fabric-example/Gemfile.lock') || '').match(/RUBY VERSION\s+ruby\s+(\S+)/) || [])[1];
  if (lockRuby) sources.push(['Gemfile.lock RUBY VERSION', lockRuby]);
  const guard = ((read('.github/workflows/helper/check-ruby-pods.sh') || '').match(/EXPECTED_RUBY="([^"]+)"/) || [])[1];
  if (guard) sources.push(['check-ruby-pods.sh EXPECTED_RUBY', guard]);
  const distinct = new Set(sources.map(([, v]) => base(v)));
  if (distinct.size > 1) {
    conflicts.push({ name: 'Ruby version', detail: `${distinct.size} different versions declared`, items: sources.map(([k, v]) => `${v} — ${k}`) });
  }
}

function run() {
  findings.length = 0;
  conflicts.length = 0;
  [
    checkNode,
    checkYarn,
    checkClangFormat,
    checkClangTidy,
    checkClangd,
    checkCmake,
    checkCmakeLang,
    checkRuby,
    checkCocoapods,
    checkJdk,
    checkXcodeBuildServer,
    checkNdk,
  ].forEach((c) => c());
  [consistencyGradle, consistencySpotless, consistencyJavaCI, consistencyRuby].forEach((c) => c());
  return { findings, conflicts };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const SYM = {
  OK: C.green('✔'),
  WARN: C.yellow('!'),
  DRIFT: C.yellow('⇄'),
  WRONG: C.red('✘'),
  MISSING: C.red('✘'),
  INFO: C.dim('·'),
};

/** @returns {number} the process exit code */
function report() {
  console.log(C.bold('\nreanimated-doctor') + C.dim('  (host toolchain vs. repo-pinned versions)\n'));

  for (const f of findings) {
    const sym = SYM[f.status] || '?';
    const head = `${sym} ${f.name.padEnd(26)} ${C.dim('need')} ${f.required.padEnd(20)} ${C.dim('found')} ${f.found}`;
    console.log(head);
    if (f.note) console.log(`   ${C.dim('→ ' + f.note)}`);
    if (f.hint && f.status !== 'OK') console.log(`   ${C.dim('fix: ' + f.hint)}`);
  }

  if (conflicts.length > 0) {
    console.log(C.bold('\nCross-file consistency') + C.dim('  (canonical sources that disagree)'));
    for (const c of conflicts) {
      console.log(`${C.yellow('⚠')} ${c.name}: ${c.detail}`);
      for (const it of c.items) console.log(`   ${C.dim('· ' + it)}`);
    }
  }

  const errors = findings.filter((f) => f.severity === 'error' && (f.status === 'WRONG' || f.status === 'MISSING'));
  const warns = findings.filter((f) => (f.status === 'WARN' || f.status === 'DRIFT') && f.severity !== 'error');

  console.log('');
  console.log(
    `${C.bold('Summary')}  ` +
      `${C.green(findings.filter((f) => f.status === 'OK').length + ' ok')}  ` +
      `${C.yellow(warns.length + ' warn')}  ` +
      `${C.red(errors.length + ' error')}  ` +
      `${C.dim(findings.filter((f) => f.status === 'INFO').length + ' info')}  ` +
      `${C.yellow(conflicts.length + ' conflict')}`
  );

  if (CI && errors.length > 0) {
    console.log(C.red('\nFailing because --ci and ' + errors.length + ' error-severity finding(s).'));
    return 1;
  }
  console.log(C.dim('\nadvisory run — exiting 0 (pass --ci to enforce)\n'));
  return 0;
}

if (require.main === module) {
  run();
  process.exit(report());
}

module.exports = { parseVersion, run, report, findings, conflicts };
