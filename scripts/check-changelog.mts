import { execFileSync } from 'node:child_process';

// These exemptions expire automatically when the packages move to their next versions.
const PACKAGE_RULES = [
  {
    packagePath: 'packages/react-native-reanimated',
    changelogPath: 'packages/react-native-reanimated/CHANGELOG.md',
    exemptVersion: '4.6.0-main',
  },
  {
    packagePath: 'packages/react-native-worklets',
    changelogPath: 'packages/react-native-worklets/CHANGELOG.md',
    exemptVersion: '0.12.0-main',
  },
];

export function findMissingChangelogs(
  changedFiles: string[],
  packageVersions = new Map<string, string>()
) {
  return PACKAGE_RULES.flatMap(
    ({ packagePath, changelogPath, exemptVersion }) => {
      if (packageVersions.get(packagePath) === exemptVersion) {
        return [];
      }

      const packagePrefix = `${packagePath}/`;
      const packageChanged = changedFiles.some((file) =>
        file.startsWith(packagePrefix)
      );
      const changelogChanged = changedFiles.includes(changelogPath);

      return packageChanged && !changelogChanged ? [changelogPath] : [];
    }
  );
}

export function getChangedFiles(base: string, head = 'HEAD') {
  return execFileSync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACDMRTUXB', `${base}...${head}`],
    { encoding: 'utf8' }
  )
    .split('\n')
    .filter(Boolean);
}

export function getPackageVersions(ref = 'HEAD') {
  return new Map(
    PACKAGE_RULES.map(({ packagePath }) => {
      const packageJson = execFileSync(
        'git',
        ['show', `${ref}:${packagePath}/package.json`],
        { encoding: 'utf8' }
      );
      const { version } = JSON.parse(packageJson) as { version: string };
      return [packagePath, version];
    })
  );
}

function main() {
  const [base, head = 'HEAD'] = process.argv.slice(2);

  if (!base) {
    console.error(
      'Usage: node --experimental-strip-types scripts/check-changelog.mts <base> [head]'
    );
    process.exitCode = 1;
    return;
  }

  const missingChangelogs = findMissingChangelogs(
    getChangedFiles(base, head),
    getPackageVersions(head)
  );

  if (missingChangelogs.length === 0) {
    console.log(
      'All changed packages include a changelog update or are temporarily exempt.'
    );
    return;
  }

  console.error(
    [
      'Changes to Reanimated and Worklets must be documented for the next release.',
      'Add a concise bullet under an appropriate section in `## Unpublished` in:',
      ...missingChangelogs.map((changelog) => `- ${changelog}`),
    ].join('\n')
  );
  process.exitCode = 1;
}

if (import.meta.filename === process.argv[1]) {
  main();
}
