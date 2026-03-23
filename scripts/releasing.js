const { execSync } = require('child_process');
const fs = require('fs');

/**
 * @typedef {object} Arg
 * @property {string} value - Argument value
 * @property {boolean} handled - Is argument known
 */

/**
 * @typedef {object} Flags
 * @property {boolean} help - Whether help option was passed
 * @property {boolean} nightly - Whether nightly option was passed
 * @property {boolean} fresh - Whether fresh option was passed
 * @property {string} customVersion - Passed custom version, if any
 * @property {boolean} rc - Whether release candidate option was passed
 * @property {boolean} beta - Whether beta option was passed
 * @property {string} packageName - Name of the package to get version for
 * @property {string} packageJsonPath - Path to package.json file
 */

/**
 * @param {string[]} rawArgs
 * @returns {{ currentVersion: string; newVersion: string }}
 */
function getVersion(rawArgs) {
  const {
    flags: { customVersion, nightly, fresh, rc, beta, packageJsonPath },
  } = getFlags(rawArgs);

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;
  let newVersion = currentVersion;

  if (customVersion) {
    newVersion = customVersion;
  } else {
    const baseVersion = currentVersion.split('-')[0];

    if (rc) {
      throw new Error('Release candidate versioning is not yet implemented');
    } else if (beta) {
      throw new Error('Beta versioning is not yet implemented');
    }

    let dateIdentifier = new Date()
      .toISOString()
      .slice(0, -5)
      .replace(/[-:T]/g, '');

    if (nightly) {
      if (currentVersion.includes('nightly')) {
        throw new Error('Cannot set nightly version on a nightly version');
      }

      dateIdentifier = dateIdentifier.slice(0, -6);
      const currentCommit = execSync('git rev-parse HEAD', {
        encoding: 'utf8',
      }).trim();
      const shortCommit = currentCommit.slice(0, 9);

      newVersion = `${baseVersion}-nightly-${dateIdentifier}-${shortCommit}`;
    } else if (fresh) {
      newVersion = `${currentVersion}-${dateIdentifier}`;
    }
  }

  return {
    currentVersion,
    newVersion,
  };
}

/**
 * @param {string[]} rawArgs
 * @returns {{ flags: Flags }}
 */
function getFlags(rawArgs) {
  const args = buildArgs(rawArgs);
  const argsResult = processArgs(args);

  processFlags(argsResult.flags);

  return argsResult;
}

/**
 * @param {string[]} rawArgs
 * @returns {Arg[]}
 */
function buildArgs(rawArgs) {
  return rawArgs.slice(2).map((arg) => ({ value: arg, handled: false }));
}

/**
 * @param {Arg[]} args
 * @returns {{ flags: Flags }}
 */
function processArgs(args) {
  const flags = {
    help: false,
    nightly: false,
    fresh: false,
    customVersion: '',
    rc: false,
    beta: false,
    packageName: '',
    packageJsonPath: '',
  };

  args.forEach((arg) => {
    if (arg.handled) {
      return;
    } else if (arg.value === '--help' || arg.value === '-h') {
      flags.help = true;
      arg.handled = true;
    } else if (arg.value === '--package-json-path' || arg.value === '-p') {
      flags.packageJsonPath = args[args.indexOf(arg) + 1].value;
      args[args.indexOf(arg) + 1].handled = true;
      arg.handled = true;
    } else if (arg.value === '--nightly' || arg.value === '-n') {
      flags.nightly = true;
      arg.handled = true;
    } else if (arg.value === '--fresh' || arg.value === '-f') {
      flags.fresh = true;
      arg.handled = true;
    } else if (arg.value === '--rc' || arg.value === '-r') {
      flags.rc = true;
      arg.handled = true;
    } else if (arg.value === '--beta' || arg.value === '-b') {
      flags.beta = true;
      arg.handled = true;
    } else if (arg.value === '--version') {
      flags.customVersion = args[args.indexOf(arg) + 1].value;
      args[args.indexOf(arg) + 1].handled = true;
      arg.handled = true;
    } else if (arg.value === '--package-name') {
      flags.packageName = args[args.indexOf(arg) + 1].value;
      args[args.indexOf(arg) + 1].handled = true;
      arg.handled = true;
    }
  });

  const unknownArgs = args.filter((arg) => !arg.handled);

  if (unknownArgs.length > 0) {
    console.error('Unknown arguments: ', unknownArgs);
    process.exit(1);
  }

  return { flags };
}

/** @param {Flags} flags */
function processFlags({ help, rc, beta, nightly, fresh, customVersion }) {
  if (help) {
    console.warn(
      'Use --nightly or -n to set nightly version.\nUse --fresh or -f to set fresh version.\nUse --rc or -r to set release candidate version.\nUse --beta or -b to set beta version.\nElse pass --version <version> or -v <version>.'
    );
    process.exit(1);
  }

  if ([nightly, fresh, customVersion, rc, beta].filter(Boolean).length > 1) {
    console.error(
      'Only one of --nightly, --fresh, --rc, --beta, and --version flags can be used.'
    );
    process.exit(1);
  }
}

module.exports = {
  getFlags,
  getVersion,
};
