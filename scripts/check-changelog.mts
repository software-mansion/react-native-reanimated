import { execFileSync } from 'node:child_process';

import {
  FRAGMENTS_README,
  PACKAGES,
  fragmentsDirectory,
  parseFragment,
  parseFragmentFileName,
} from './changelog-fragments.mts';

export type ChangeStatus = 'added' | 'modified' | 'deleted';
export type Change = { status: ChangeStatus; path: string };

export type PullRequest = {
  changes: Change[];
  readFile: (path: string) => string;
  releasedPackagePaths?: Set<string>;
};

function main() {
  const [base, head = 'HEAD'] = process.argv.slice(2);

  if (!base) {
    console.error(
      'Usage: node --experimental-strip-types scripts/check-changelog.mts <base> [head]'
    );
    process.exitCode = 1;
    return;
  }

  const problems = findProblems({
    changes: getChanges(base, head),
    readFile: (path) => readFileAt(head, path),
    releasedPackagePaths: getReleasedPackagePaths(base, head),
  });

  if (problems.length === 0) {
    console.log('The changelog fragments are correct.');
    return;
  }

  console.error(
    [
      ...problems.map((problem) => `- ${problem}`),
      '',
      'Add a fragment with `yarn workspace <package> changelog:add`. See `packages/react-native-reanimated/changelog/README.md`.',
    ].join('\n')
  );
  process.exitCode = 1;
}

export function findProblems({
  changes,
  readFile,
  releasedPackagePaths = new Set(),
}: PullRequest) {
  return PACKAGES.flatMap(({ path: packagePath }) => {
    const packageChanges = changes.filter(({ path }) =>
      path.startsWith(`${packagePath}/`)
    );
    const fragmentProblems = findFragmentProblems(
      packagePath,
      packageChanges,
      readFile
    );

    return releasedPackagePaths.has(packagePath)
      ? fragmentProblems
      : [
          ...findMissingFragment(packagePath, packageChanges),
          ...fragmentProblems,
          ...findForbiddenChanges(packagePath, packageChanges),
        ];
  });
}

function findMissingFragment(packagePath: string, packageChanges: Change[]) {
  const directory = `${fragmentsDirectory(packagePath)}/`;
  const sourceChanged = packageChanges.some(
    ({ path }) =>
      !path.startsWith(directory) && path !== `${packagePath}/CHANGELOG.md`
  );
  const fragmentAdded = packageChanges.some(
    (change) => isFragment(packagePath, change) && change.status === 'added'
  );

  return sourceChanged && !fragmentAdded
    ? [`${packagePath} changed, but ${directory} has no new fragment.`]
    : [];
}

function findFragmentProblems(
  packagePath: string,
  packageChanges: Change[],
  readFile: (path: string) => string
) {
  return packageChanges
    .filter(
      (change) => isFragment(packagePath, change) && change.status !== 'deleted'
    )
    .flatMap(({ path }) => {
      const fileName = path.slice(fragmentsDirectory(packagePath).length + 1);
      const nameErrors = parseFragmentFileName(fileName)
        ? []
        : [
            'The file name must be `<slug>.<breaking|feature|fix|other>.md` with a slug of `a-z`, `0-9` and `-`.',
          ];
      return [...nameErrors, ...parseFragment(readFile(path)).errors].map(
        (error) => `${path}: ${error}`
      );
    });
}

function findForbiddenChanges(packagePath: string, packageChanges: Change[]) {
  const changelogPath = `${packagePath}/CHANGELOG.md`;
  return packageChanges.flatMap((change) => {
    if (change.path === changelogPath) {
      return [
        `${changelogPath} must change only in a release pull request. Add a fragment instead.`,
      ];
    }
    if (isFragment(packagePath, change) && change.status === 'deleted') {
      return [`${change.path} must be deleted only in a release pull request.`];
    }
    return [];
  });
}

function isFragment(packagePath: string, { path }: Change) {
  const directory = `${fragmentsDirectory(packagePath)}/`;
  return (
    path.startsWith(directory) && path !== `${directory}${FRAGMENTS_README}`
  );
}

export function getChanges(base: string, head = 'HEAD') {
  return parseNameStatus(
    execFileSync('git', ['diff', '--name-status', '-z', `${base}...${head}`], {
      encoding: 'utf8',
    })
  );
}

export function parseNameStatus(nulSeparatedOutput: string): Change[] {
  const fields = nulSeparatedOutput.split('\0').filter(Boolean);
  const changes: Change[] = [];
  while (fields.length > 0) {
    const gitStatus = fields.shift()!;
    if (gitStatus.startsWith('R')) {
      changes.push({ status: 'deleted', path: fields.shift()! });
      changes.push({ status: 'added', path: fields.shift()! });
    } else if (gitStatus.startsWith('C')) {
      fields.shift();
      changes.push({ status: 'added', path: fields.shift()! });
    } else {
      changes.push({
        status: toChangeStatus(gitStatus),
        path: fields.shift()!,
      });
    }
  }
  return changes;
}

function toChangeStatus(gitStatus: string): ChangeStatus {
  if (gitStatus === 'A') {
    return 'added';
  }
  return gitStatus === 'D' ? 'deleted' : 'modified';
}

function getReleasedPackagePaths(base: string, head: string) {
  const mergeBase = execFileSync('git', ['merge-base', base, head], {
    encoding: 'utf8',
  }).trim();
  return new Set(
    PACKAGES.map(({ path }) => path).filter(
      (path) =>
        readPackageVersion(mergeBase, path) !== readPackageVersion(head, path)
    )
  );
}

function readPackageVersion(ref: string, packagePath: string) {
  const { version } = JSON.parse(
    readFileAt(ref, `${packagePath}/package.json`)
  ) as { version: string };
  return version;
}

function readFileAt(ref: string, path: string) {
  return execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8' });
}

if (import.meta.filename === process.argv[1]) {
  main();
}
