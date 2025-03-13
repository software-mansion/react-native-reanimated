const { cat, exec } = require('shelljs');

/**
 * @param {string[]} rawArgs
 * @param {string} packageJsonPath
 * @returns {{ currentVersion: string; newVersion: string }}
 */
function getVersion(rawArgs, packageJsonPath) {
  const args = rawArgs.slice(2).map((arg) => ({
    value: arg,
    handled: false,
  }));

  let IS_HELP = false;
  let IS_NIGHTLY = false;
  let IS_FRESH = false;
  let IS_SET_CUSTOM = false;

  let customVersion = '';

  args.forEach((arg) => {
    if (arg.value === '--help' || arg.value === '-h') {
      IS_HELP = true;
      arg.handled = true;
    } else if (arg.value === '--nightly' || arg.value === '-n') {
      IS_NIGHTLY = true;
      arg.handled = true;
    } else if (arg.value === '--fresh' || arg.value === '-f') {
      IS_FRESH = true;
      arg.handled = true;
    } else if (!IS_SET_CUSTOM) {
      customVersion = arg.value;
      IS_SET_CUSTOM = true;
      arg.handled = true;
    }
  });

  const unknownArgs = args.filter((arg) => !arg.handled);
  if (unknownArgs.length > 0) {
    console.error('Unknown arguments: ', unknownArgs);
    process.exit(1);
  }

  if (IS_HELP) {
    console.warn(
      'Use --nightly or -n to set nightly version.\nUse --fresh or -f to set fresh version.\nElse pass the version as an argument.'
    );
    process.exit(1);
  }

  if (IS_NIGHTLY && IS_FRESH) {
    throw new Error('Cannot set nightly and fresh version at the same time.');
  }

  if ((IS_NIGHTLY || IS_FRESH) && IS_SET_CUSTOM) {
    throw new Error('Cannot set nightly or fresh version with custom version.');
  }

  if (!IS_SET_CUSTOM && !IS_NIGHTLY && !IS_FRESH) {
    throw new Error('Version not set.');
  }

  const packageJson = JSON.parse(cat(packageJsonPath));
  const currentVersion = packageJson.version;

  let newVersion = currentVersion;
  if (IS_SET_CUSTOM) {
    newVersion = customVersion;
  } else {
    let dateIdentifier = new Date()
      .toISOString()
      .slice(0, -5)
      .replace(/[-:T]/g, '');

    if (IS_NIGHTLY) {
      if (currentVersion.includes('nightly')) {
        throw new Error('Cannot set nightly version on a nightly version');
      }

      dateIdentifier = dateIdentifier.slice(0, -6);
      const currentCommit = exec('git rev-parse HEAD', {
        silent: true,
      }).stdout.trim();
      const shortCommit = currentCommit.slice(0, 9);

      newVersion = `${currentVersion.split('-')[0]}-nightly-${dateIdentifier}-${shortCommit}`;
    } else if (IS_FRESH) {
      newVersion = `${currentVersion}-${dateIdentifier}`;
    }
  }

  return {
    currentVersion,
    newVersion,
  };
}

module.exports = {
  getVersion,
};
