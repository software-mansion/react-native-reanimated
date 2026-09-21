export const PACKAGES = [
  { name: 'reanimated', path: 'packages/react-native-reanimated' },
  { name: 'worklets', path: 'packages/react-native-worklets' },
] as const;

export const CATEGORY_HEADINGS = {
  breaking: '### 🛠 Breaking changes',
  feature: '### 🎉 New features',
  fix: '### 🐛 Bug fixes',
  other: '### 💡 Others',
} as const;

export type Category = keyof typeof CATEGORY_HEADINGS;

export const CATEGORIES = Object.keys(CATEGORY_HEADINGS) as Category[];

export const FRAGMENTS_DIRECTORY = 'changelog';
export const FRAGMENTS_README = 'README.md';

export type Fragment = {
  text: string;
  pullRequest?: number;
  authors?: string[];
};

export type ParsedFragment =
  | { fragment: Fragment; errors: [] }
  | { fragment?: undefined; errors: string[] };

const SLUG_PATTERN = '[a-z0-9]+(?:-[a-z0-9]+)*';
const FRAGMENT_NAME_PATTERN = new RegExp(
  `^(${SLUG_PATTERN})\\.(${CATEGORIES.join('|')})\\.md$`
);
const HAND_MADE_LINK_PATTERN = /\(\[?#\d+/;
const AUTHOR_PATTERN = /^@[A-Za-z0-9-]+$/;

export function fragmentsDirectory(packagePath: string) {
  return `${packagePath}/${FRAGMENTS_DIRECTORY}`;
}

export function isValidSlug(slug: string) {
  return new RegExp(`^${SLUG_PATTERN}$`).test(slug);
}

export function fragmentFileName(slug: string, category: Category) {
  return `${slug}.${category}.md`;
}

export function parseFragmentFileName(fileName: string) {
  const match = FRAGMENT_NAME_PATTERN.exec(fileName);
  return match ? { slug: match[1], category: match[2] as Category } : undefined;
}

export function parseFragment(content: string): ParsedFragment {
  const [text, ...metadataLines] = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!text) {
    return { errors: ['The fragment is empty.'] };
  }

  const errors = validateText(text);
  const fragment: Fragment = { text };

  for (const line of metadataLines) {
    const error = applyMetadataLine(fragment, line);
    if (error) {
      errors.push(error);
    }
  }

  return errors.length === 0 ? { fragment, errors: [] } : { errors };
}

function validateText(text: string) {
  const errors: string[] = [];
  if (!text.endsWith('.')) {
    errors.push('The entry must end with a period.');
  }
  if (text.startsWith('- ')) {
    errors.push('The entry must not start with a list marker.');
  }
  if (HAND_MADE_LINK_PATTERN.test(text)) {
    errors.push(
      'The entry must not contain a pull request link. The squash script adds it.'
    );
  }
  return errors;
}

function applyMetadataLine(fragment: Fragment, line: string) {
  const separator = line.indexOf(':');
  const key = line.slice(0, separator);
  const value = line.slice(separator + 1).trim();

  if (key === 'pr') {
    if (fragment.pullRequest !== undefined) {
      return 'The fragment has more than one `pr:` line.';
    }
    if (!/^\d+$/.test(value)) {
      return `\`pr:\` must be a pull request number, got "${value}".`;
    }
    fragment.pullRequest = Number(value);
    return undefined;
  }

  if (key === 'by') {
    if (fragment.authors !== undefined) {
      return 'The fragment has more than one `by:` line.';
    }
    const authors = value.split(',').map((author) => author.trim());
    const invalidAuthor = authors.find(
      (author) => !AUTHOR_PATTERN.test(author)
    );
    if (invalidAuthor !== undefined) {
      return `\`by:\` must list GitHub handles like \`@user\`, got "${invalidAuthor}".`;
    }
    fragment.authors = authors.map((author) => author.slice(1));
    return undefined;
  }

  return `The entry must be one line. Unexpected line: "${line}".`;
}
