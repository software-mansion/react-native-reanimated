import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';

import type { Category, Fragment } from './changelog-fragments.mts';
import {
  CATEGORIES,
  CATEGORY_HEADINGS,
  FRAGMENTS_README,
  PACKAGES,
  fragmentsDirectory,
  parseFragment,
  parseFragmentFileName,
} from './changelog-fragments.mts';

export type FragmentFile = { path: string; category: Category } & Fragment;

export type Entry = {
  category: Category;
  text: string;
  pullRequest?: number;
  authors: string[];
};

type Options = {
  packagePath: string;
  version: string | undefined;
  date: string;
  cut: string | undefined;
  preview: boolean;
};

export type Resolvers = {
  findPullRequest: (fragmentPath: string) => number | undefined;
  findAuthors: (pullRequests: number[]) => Map<number, string[]>;
};

const USAGE = `Usage: yarn changelog:squash <${PACKAGES.map(({ name }) => name).join('|')}> [<version>] [--date YYYY-MM-DD] [--cut <stable-ref>] [--dry-run]
Without a version, the script prints the unpublished section and changes no file.
--cut takes only the fragments that existed when <stable-ref> left this branch.`;
const REPOSITORY = 'software-mansion/react-native-reanimated';
const REPOSITORY_ROOT = join(import.meta.dirname, '..');
const UNPUBLISHED_HEADING = '## Unpublished';
const DELETED_ACCOUNT_LOGIN = 'ghost';
const PULL_REQUEST_ALIAS = 'pr';
const VERSION_HEADING_PATTERN = /^## \d/m;
const FIRST_PULL_REQUEST_PATTERN = /\(#(\d+)\)/;

function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const fragmentFiles = readFragmentFiles(options.packagePath, options.cut);
    if (fragmentFiles.length === 0 && options.version !== undefined) {
      throw new Error(
        `There are no fragments to move into ${options.version}.`
      );
    }

    const section = buildSection(options, fragmentFiles);
    if (options.preview) {
      console.log(section);
      return;
    }
    applyRelease(options.packagePath, section, fragmentFiles);
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

function parseArguments(args: string[]): Options {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      date: { type: 'string' },
      cut: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  const [packageName, version] = positionals;
  const packagePath = PACKAGES.find(({ name }) => name === packageName)?.path;
  if (!packagePath) {
    throw new Error(USAGE);
  }
  return {
    packagePath,
    version,
    date: values.date ?? today(),
    cut: values.cut,
    preview: values['dry-run'] || version === undefined,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readFragmentFiles(
  packagePath: string,
  cut: string | undefined
): FragmentFile[] {
  const directory = fragmentsDirectory(packagePath);
  const paths = readdirSync(join(REPOSITORY_ROOT, directory))
    .filter((fileName) => fileName !== FRAGMENTS_README)
    .map((fileName) => `${directory}/${fileName}`);

  return keepPathsFromCut(
    paths,
    cut === undefined ? undefined : listPathsAtCut(directory, cut)
  ).map((path) =>
    toFragmentFile(path, readFileSync(join(REPOSITORY_ROOT, path), 'utf8'))
  );
}

export function keepPathsFromCut(
  paths: string[],
  pathsAtCut: string[] | undefined
) {
  return pathsAtCut === undefined
    ? paths
    : paths.filter((path) => pathsAtCut.includes(path));
}

function listPathsAtCut(directory: string, stableRef: string) {
  const cut = git(['merge-base', 'HEAD', stableRef]);
  return git(['ls-tree', '--name-only', cut, `${directory}/`]).split('\n');
}

export function toFragmentFile(path: string, content: string): FragmentFile {
  const name = parseFragmentFileName(basename(path));
  const { fragment, errors } = parseFragment(content);
  if (!name || !fragment) {
    throw new Error([`${path} is not a valid fragment.`, ...errors].join('\n'));
  }
  return { path, category: name.category, ...fragment };
}

function buildSection(
  { version, date, preview }: Options,
  fragmentFiles: FragmentFile[]
) {
  return renderSection(
    version === undefined ? UNPUBLISHED_HEADING : releaseHeading(version, date),
    resolveEntries(fragmentFiles, gitHubResolvers(preview), {
      allowUnresolved: preview,
    })
  );
}

export function releaseHeading(version: string, date: string) {
  return `## ${version} — ${date}`;
}

export function resolveEntries(
  fragmentFiles: FragmentFile[],
  { findPullRequest, findAuthors }: Resolvers,
  { allowUnresolved }: { allowUnresolved: boolean }
): Entry[] {
  const resolvedFiles = fragmentFiles.map((fragmentFile) => ({
    ...fragmentFile,
    pullRequest: fragmentFile.pullRequest ?? findPullRequest(fragmentFile.path),
  }));

  const unresolvedFile = resolvedFiles.find(
    ({ pullRequest }) => pullRequest === undefined
  );
  if (unresolvedFile && !allowUnresolved) {
    throw new Error(
      `Cannot find the pull request that added ${unresolvedFile.path}. Add a \`pr: <number>\` line to it.`
    );
  }

  const lookedUpAuthors = findAuthors(
    resolvedFiles.flatMap(({ pullRequest, authors }) =>
      pullRequest === undefined || authors ? [] : [pullRequest]
    )
  );

  return resolvedFiles.map(({ category, text, pullRequest, authors }) => ({
    category,
    text,
    pullRequest,
    authors: authors ?? lookedUpAuthors.get(pullRequest!) ?? [],
  }));
}

export function renderSection(heading: string, entries: Entry[]) {
  const categorySections = CATEGORIES.flatMap((category) => {
    const lines = entries
      .filter((entry) => entry.category === category)
      .sort(byNewestPullRequest)
      .map(renderEntry);
    return lines.length === 0
      ? []
      : [`${CATEGORY_HEADINGS[category]}\n\n${lines.join('\n')}`];
  });
  return [heading, ...categorySections].join('\n\n');
}

function byNewestPullRequest(a: Entry, b: Entry) {
  return (b.pullRequest ?? Infinity) - (a.pullRequest ?? Infinity);
}

function renderEntry({ text, pullRequest, authors }: Entry) {
  if (pullRequest === undefined) {
    return `- ${text} (this PR)`;
  }
  const link = `[#${pullRequest}](https://github.com/${REPOSITORY}/pull/${pullRequest})`;
  const credit = authors
    .map((author) => `[@${author}](https://github.com/${author})`)
    .join(', ');
  return `- ${text} (${credit ? `${link} by ${credit}` : link})`;
}

function applyRelease(
  packagePath: string,
  section: string,
  fragmentFiles: FragmentFile[]
) {
  const changelogPath = join(REPOSITORY_ROOT, packagePath, 'CHANGELOG.md');
  writeFileSync(
    changelogPath,
    insertSection(readFileSync(changelogPath, 'utf8'), section)
  );
  for (const { path } of fragmentFiles) {
    rmSync(join(REPOSITORY_ROOT, path));
  }
}

export function insertSection(changelog: string, section: string) {
  const firstSection = changelog.search(VERSION_HEADING_PATTERN);
  if (firstSection === -1) {
    return `${changelog.trimEnd()}\n\n${section}\n`;
  }
  return `${changelog.slice(0, firstSection)}${section}\n\n${changelog.slice(firstSection)}`;
}

function gitHubResolvers(preview: boolean): Resolvers {
  return {
    findPullRequest: (fragmentPath) =>
      extractPullRequestOfNewestAdd(
        git([
          'log',
          '--diff-filter=A',
          '--follow',
          '--format=%s',
          '--',
          fragmentPath,
        ])
      ),
    findAuthors: (pullRequests) => {
      if (pullRequests.length === 0) {
        return new Map();
      }
      const response = queryGitHub(buildAuthorsQuery(pullRequests));
      if (response !== undefined) {
        return parseAuthorsResponse(response);
      }
      if (preview) {
        return new Map();
      }
      throw new Error(
        'Cannot reach GitHub with `gh`. Log in with `gh auth login`, or add a `by: @user` line to each fragment.'
      );
    },
  };
}

export function extractPullRequestOfNewestAdd(gitLogSubjects: string) {
  return extractPullRequest(gitLogSubjects.trim().split('\n')[0]);
}

export function extractPullRequest(commitSubject: string) {
  const match = FIRST_PULL_REQUEST_PATTERN.exec(commitSubject);
  return match ? Number(match[1]) : undefined;
}

export function buildAuthorsQuery(pullRequests: number[]) {
  const [owner, name] = REPOSITORY.split('/');
  const fields = [...new Set(pullRequests)]
    .map(
      (pullRequest) =>
        `${PULL_REQUEST_ALIAS}${pullRequest}: pullRequest(number: ${pullRequest}) { author { login } }`
    )
    .join(' ');
  return `query { repository(owner: "${owner}", name: "${name}") { ${fields} } }`;
}

function queryGitHub(query: string) {
  try {
    return execFileSync('gh', ['api', 'graphql', '-f', `query=${query}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    return (error as { stdout?: string }).stdout || undefined;
  }
}

export function parseAuthorsResponse(response: string) {
  const { data } = JSON.parse(response) as {
    data: {
      repository: Record<string, { author: { login: string } | null } | null>;
    };
  };
  const pullRequests = Object.entries(data.repository).map(
    ([alias, pullRequest]) => ({
      number: Number(alias.slice(PULL_REQUEST_ALIAS.length)),
      pullRequest,
    })
  );

  const unknownNumbers = pullRequests
    .filter(({ pullRequest }) => pullRequest === null)
    .map(({ number }) => `#${number}`);
  if (unknownNumbers.length > 0) {
    throw new Error(
      `GitHub has no pull request ${unknownNumbers.join(', ')}. Set the correct number with a \`pr: <number>\` line in the fragment.`
    );
  }

  return new Map(
    pullRequests.map(({ number, pullRequest }) => {
      const login = pullRequest!.author?.login;
      return [
        number,
        login === undefined || login === DELETED_ACCOUNT_LOGIN ? [] : [login],
      ];
    })
  );
}

function git(args: string[]) {
  return execFileSync('git', args, {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

if (import.meta.filename === process.argv[1]) {
  main();
}
