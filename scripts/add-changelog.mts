import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

import type { Category } from './changelog-fragments.mts';
import {
  CATEGORIES,
  PACKAGES,
  fragmentFileName,
  fragmentsDirectory,
  isValidSlug,
  parseFragment,
} from './changelog-fragments.mts';

type PackageName = (typeof PACKAGES)[number]['name'];

export type Answers = {
  packages: PackageName[];
  category?: Category;
  message?: string;
  slug?: string;
};

type Question = {
  missing: (answers: Answers) => boolean;
  flag: string;
  prompt: (detectedPackages: PackageName[]) => string;
  apply: (
    answers: Answers,
    reply: string,
    detectedPackages: PackageName[]
  ) => void;
};

const USAGE = `Usage: yarn changelog:add [--package ${PACKAGES.map(({ name }) => name).join('|')}]... [--type ${CATEGORIES.join('|')}] [--message '<text>'|-] [--slug <name>]
\`--message -\` reads the text from stdin. With no terminal, all flags but --slug are required.`;
const MESSAGE_FROM_STDIN = '-';
const BRANCHES_WITHOUT_SLUG = /^(main|master|.*-stable)$/;
const REPOSITORY_ROOT = join(import.meta.dirname, '..');

async function main() {
  try {
    const answers = withDefaults(
      parseArguments(process.argv.slice(2)),
      getCurrentBranch(),
      () => readFileSync(process.stdin.fd, 'utf8')
    );
    const completeAnswers = process.stdin.isTTY
      ? await askMissing(answers, detectPackages(getChangedFiles()))
      : answers;

    for (const { path, collidedWith } of planFragments(
      completeAnswers,
      (path) => existsSync(join(REPOSITORY_ROOT, path))
    )) {
      if (collidedWith) {
        console.warn(`Warning: ${collidedWith} exists. Using ${path}.`);
      }
      writeFragment(path, completeAnswers.message!);
      console.log(path);
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

export function parseArguments(args: string[]): Answers {
  const { values } = parseArgs({
    args,
    options: {
      package: { type: 'string', multiple: true },
      type: { type: 'string' },
      message: { type: 'string' },
      slug: { type: 'string' },
    },
  });
  return {
    packages: [...new Set(values.package ?? [])] as PackageName[],
    category: values.type as Category | undefined,
    message: values.message,
    slug: values.slug,
  };
}

export function withDefaults(
  answers: Answers,
  branch: string,
  readStdin: () => string
): Answers {
  return {
    ...answers,
    message:
      answers.message === MESSAGE_FROM_STDIN
        ? readStdin().trim()
        : answers.message,
    slug: answers.slug ?? slugFromBranch(branch),
  };
}

export function slugFromBranch(branch: string) {
  if (BRANCHES_WITHOUT_SLUG.test(branch)) {
    return undefined;
  }
  const slug = branch
    .slice(branch.indexOf('/') + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || undefined;
}

export function detectPackages(changedFiles: string[]) {
  return PACKAGES.filter(({ path }) =>
    changedFiles.some((file) => file.startsWith(`${path}/`))
  ).map(({ name }) => name);
}

const QUESTIONS: Question[] = [
  {
    missing: ({ packages }) => packages.length === 0,
    flag: '--package',
    prompt: (detectedPackages) =>
      `Package (${PACKAGES.map(({ name }) => name).join(', ')}; comma-separated) [${detectedPackages.join(', ')}]: `,
    apply: (answers, reply, detectedPackages) => {
      answers.packages = reply
        ? (reply.split(',').map((name) => name.trim()) as PackageName[])
        : detectedPackages;
    },
  },
  {
    missing: ({ category }) => category === undefined,
    flag: '--type',
    prompt: () => `Type (${CATEGORIES.join(', ')}): `,
    apply: (answers, reply) => {
      answers.category = reply as Category;
    },
  },
  {
    missing: ({ message }) => message === undefined,
    flag: '--message',
    prompt: () => 'Entry (one sentence that ends with a period): ',
    apply: (answers, reply) => {
      answers.message = reply;
    },
  },
  {
    missing: ({ slug }) => slug === undefined,
    flag: '--slug',
    prompt: () => 'Slug (the branch gives no name; use a-z, 0-9 and -): ',
    apply: (answers, reply) => {
      answers.slug = reply;
    },
  },
];

async function askMissing(answers: Answers, detectedPackages: PackageName[]) {
  const completeAnswers = { ...answers };
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    for (const question of QUESTIONS) {
      if (question.missing(completeAnswers)) {
        question.apply(
          completeAnswers,
          (await readline.question(question.prompt(detectedPackages))).trim(),
          detectedPackages
        );
      }
    }
  } finally {
    readline.close();
  }
  return completeAnswers;
}

export function planFragments(
  answers: Answers,
  exists: (path: string) => boolean
) {
  const errors = validateAnswers(answers);
  if (errors.length > 0) {
    throw new Error([...errors, USAGE].join('\n'));
  }

  return answers.packages.map((packageName) => {
    const directory = fragmentsDirectory(
      PACKAGES.find(({ name }) => name === packageName)!.path
    );
    return findFreePath(directory, answers.slug!, answers.category!, exists);
  });
}

export function validateAnswers(answers: Answers) {
  const missingFlags = QUESTIONS.filter(({ missing }) => missing(answers)).map(
    ({ flag }) => flag
  );
  if (missingFlags.length > 0) {
    return [`Missing: ${missingFlags.join(', ')}.`];
  }

  const errors = [...parseFragment(answers.message!).errors];
  const unknownPackage = answers.packages.find(
    (packageName) => !PACKAGES.some(({ name }) => name === packageName)
  );
  if (unknownPackage !== undefined) {
    errors.push(`Unknown package "${unknownPackage}".`);
  }
  if (!CATEGORIES.includes(answers.category!)) {
    errors.push(`Unknown type "${answers.category}".`);
  }
  if (!isValidSlug(answers.slug!)) {
    errors.push(
      `The slug "${answers.slug}" must use only \`a-z\`, \`0-9\` and \`-\`.`
    );
  }
  return errors;
}

function findFreePath(
  directory: string,
  slug: string,
  category: Category,
  exists: (path: string) => boolean
) {
  const firstChoice = `${directory}/${fragmentFileName(slug, category)}`;
  let path = firstChoice;
  for (let suffix = 2; exists(path); suffix++) {
    path = `${directory}/${fragmentFileName(`${slug}-${suffix}`, category)}`;
  }
  return { path, collidedWith: path === firstChoice ? undefined : firstChoice };
}

function writeFragment(path: string, message: string) {
  const absolutePath = join(REPOSITORY_ROOT, path);
  mkdirSync(join(absolutePath, '..'), { recursive: true });
  writeFileSync(absolutePath, `${message}\n`);
}

function getCurrentBranch() {
  return git(['branch', '--show-current']);
}

function getChangedFiles() {
  const mainBranch = ['origin/main', 'main'].find((ref) => {
    try {
      git(['rev-parse', '--verify', '--quiet', ref]);
      return true;
    } catch {
      return false;
    }
  });
  const committed = mainBranch
    ? git(['diff', '--name-only', `${mainBranch}...HEAD`])
    : '';
  const uncommitted = git(['status', '--porcelain', '--no-renames', '-z'])
    .split('\0')
    .map((entry) => entry.slice(3))
    .join('\n');
  return `${committed}\n${uncommitted}`.split('\n').filter(Boolean);
}

function git(args: string[]) {
  return execFileSync('git', args, {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trimEnd();
}

if (import.meta.filename === process.argv[1]) {
  await main();
}
