import { execFileSync } from 'node:child_process';

const PACKAGE_CHANGELOGS = new Map([
  [
    'packages/react-native-reanimated',
    'packages/react-native-reanimated/CHANGELOG.md',
  ],
  [
    'packages/react-native-worklets',
    'packages/react-native-worklets/CHANGELOG.md',
  ],
]);

export function findMissingChangelogs(changedFiles: string[]) {
  return [...PACKAGE_CHANGELOGS].flatMap(([packagePath, changelogPath]) => {
    const packagePrefix = `${packagePath}/`;
    const packageChanged = changedFiles.some((file) =>
      file.startsWith(packagePrefix)
    );
    const changelogChanged = changedFiles.includes(changelogPath);

    return packageChanged && !changelogChanged ? [changelogPath] : [];
  });
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

function main() {
  const [base, head = 'HEAD'] = process.argv.slice(2);

  if (!base) {
    console.error(
      'Usage: node --experimental-strip-types scripts/check-changelog.mts <base> [head]'
    );
    process.exitCode = 1;
    return;
  }

  const missingChangelogs = findMissingChangelogs(getChangedFiles(base, head));

  if (missingChangelogs.length === 0) {
    console.log('All changed packages include a changelog update.');
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
