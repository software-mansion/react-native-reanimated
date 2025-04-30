const { cat, exec } = require('shelljs');

/**
 * @typedef {object} Arg
 * @property {string} value - argument value
 * @property {boolean} handled - is argument known
 */

/**
 * @typedef {object} Flags
 * @property {boolean} help - whether help option was passed
 * @property {boolean} nightly - whether nightly option was passed
 * @property {boolean} fresh - whether fresh option was passed
 * @property {boolean} custom - whether custom version was passed
 */

/**
 * @param {string[]} rawArgs
 * @param {string} packageJsonPath
 * @returns {{ currentVersion: string; newVersion: string }}
 */
function getVersion(rawArgs, packageJsonPath) {
  const { flags: { custom, nightly, fresh }, customVersion } = getFlags(rawArgs)
  const packageJson = JSON.parse(cat(packageJsonPath));
  const currentVersion = packageJson.version;

  let newVersion = currentVersion;

  if (custom) {
    newVersion = customVersion;
  } else {
    let dateIdentifier = new Date()
      .toISOString()
      .slice(0, -5)
      .replace(/[-:T]/g, '');

    if (nightly) {
      if (currentVersion.includes('nightly')) {
        throw new Error('Cannot set nightly version on a nightly version');
      }

      dateIdentifier = dateIdentifier.slice(0, -6);
      const currentCommit = exec('git rev-parse HEAD', {
        silent: true,
      }).stdout.trim();
      const shortCommit = currentCommit.slice(0, 9);

      newVersion = `${currentVersion.split('-')[0]}-nightly-${dateIdentifier}-${shortCommit}`;
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
 * @returns {{ flags: Flags; customVersion: string }}
 */
function getFlags(rawArgs) {
  const args = buildArgs(rawArgs);
  const argsResult = processArgs(args)

  processFlags(argsResult.flags)

  return argsResult
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
 * @returns {{ flags: Flags; customVersion: string }}
 */
function processArgs(args) {
  const flags = {
    help: false,
    nightly: false,
    fresh: false,
    custom: false,
  }

  let customVersion = '';

  args.forEach((arg) => {
    if (arg.value === '--help' || arg.value === '-h') {
      flags.help = true;
      arg.handled = true;
    } else if (arg.value === '--nightly' || arg.value === '-n') {
      flags.nightly = true;
      arg.handled = true;
    } else if (arg.value === '--fresh' || arg.value === '-f') {
      flags.fresh = true;
      arg.handled = true;
    } else if (!flags.custom) {
      customVersion = arg.value;
      flags.custom = true;
      arg.handled = true;
    }
  });

  const unknownArgs = args.filter((arg) => !arg.handled);

  if (unknownArgs.length > 0) {
    console.error('Unknown arguments: ', unknownArgs);
    process.exit(1);
  }

  return { flags, customVersion };
}

/**
 * @param {Flags} flags
 */
function processFlags({ help, nightly, fresh, custom }) {
  if (help) {
    console.warn(
      'Use --nightly or -n to set nightly version.\nUse --fresh or -f to set fresh version.\nElse pass the version as an argument.'
    );
    process.exit(1);
  }

  if (nightly && fresh) {
    throw new Error('Cannot set nightly and fresh version at the same time.');
  }

  if ((nightly || fresh) && custom) {
    throw new Error('Cannot set nightly or fresh version with custom version.');
  }

  if (!custom && !nightly && !fresh) {
    throw new Error('Version not set.');
  }
}

module.exports = {
  getFlags,
  getVersion,
};
