import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

import type { Category } from './changelog-fragments.mts';
import {
  CATEGORIES,
  REPOSITORY_ROOT,
  fragmentFileName,
  fragmentsDirectory,
  isValidSlug,
  packagePathFromCwd,
  parseFragment,
} from './changelog-fragments.mts';

export type Answers = {
  category?: Category;
  message?: string;
  slug?: string;
};

type Question = {
  missing: (answers: Answers) => boolean;
  flag: string;
  prompt: string;
  apply: (answers: Answers, reply: string) => void;
};

const USAGE = `Usage: yarn workspace <package> changelog:add [--type ${CATEGORIES.join('|')}] [--message '<text>'|-] [--slug <name>]
\`--message -\` reads the text from stdin. With no terminal, --type and --message are required.`;
const MESSAGE_FROM_STDIN = '-';
const BRANCHES_WITHOUT_SLUG = /^(main|master|.*-stable)$/;

async function main() {
  try {
    const directory = fragmentsDirectory(packagePathFromCwd());
    const answers = withDefaults(
      parseArguments(process.argv.slice(2)),
      getCurrentBranch(),
      () => readFileSync(process.stdin.fd, 'utf8')
    );
    const completeAnswers = process.stdin.isTTY
      ? await askMissing(answers)
      : answers;

    const { path, collidedWith } = planFragment(
      directory,
      completeAnswers,
      (path) => existsSync(join(REPOSITORY_ROOT, path))
    );
    if (collidedWith) {
      console.warn(`Warning: ${collidedWith} exists. Using ${path}.`);
    }
    writeFragment(path, completeAnswers.message!);
    console.log(path);
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}

export function parseArguments(args: string[]): Answers {
  const { values } = parseArgs({
    args,
    options: {
      type: { type: 'string' },
      message: { type: 'string' },
      slug: { type: 'string' },
    },
  });
  return {
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

const QUESTIONS: Question[] = [
  {
    missing: ({ category }) => category === undefined,
    flag: '--type',
    prompt: `Type (${CATEGORIES.join(', ')}): `,
    apply: (answers, reply) => {
      answers.category = reply as Category;
    },
  },
  {
    missing: ({ message }) => message === undefined,
    flag: '--message',
    prompt: 'Entry (one sentence): ',
    apply: (answers, reply) => {
      answers.message = reply;
    },
  },
  {
    missing: ({ slug }) => slug === undefined,
    flag: '--slug',
    prompt: 'Slug (the branch gives no name; use a-z, 0-9 and -): ',
    apply: (answers, reply) => {
      answers.slug = reply;
    },
  },
];

async function askMissing(answers: Answers) {
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
          (await readline.question(question.prompt)).trim()
        );
      }
    }
  } finally {
    readline.close();
  }
  return completeAnswers;
}

export function planFragment(
  directory: string,
  answers: Answers,
  exists: (path: string) => boolean
) {
  const errors = validateAnswers(answers);
  if (errors.length > 0) {
    throw new Error([...errors, USAGE].join('\n'));
  }
  return findFreePath(directory, answers.slug!, answers.category!, exists);
}

export function validateAnswers(answers: Answers) {
  const missingFlags = QUESTIONS.filter(({ missing }) => missing(answers)).map(
    ({ flag }) => flag
  );
  if (missingFlags.length > 0) {
    return [`Missing: ${missingFlags.join(', ')}.`];
  }

  const errors = [...parseFragment(answers.message!).errors];
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
