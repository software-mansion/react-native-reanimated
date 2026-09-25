/**
 * Every documentation page must open with its own level 1 heading, so that the
 * title Docusaurus shows, the title it puts in the table of contents and the
 * name the OG image generator asks for all come from the same place. Front
 * matter alone does not satisfy the rule.
 *
 * The heading may sit inside a wrapper element such as `<Badges>`, which
 * renders the version badge beside it, and a `<DeprecatedBanner>` may come
 * before it. A page that must open with something else skips the rule with a
 * `lint-ignore-docs-title` comment above its content.
 */

const SKIPPED_BEFORE_TITLE = new Set(['yaml', 'toml', 'mdxjsEsm']);
const ALLOWED_BEFORE_TITLE = new Set(['DeprecatedBanner']);
const IGNORE_COMMENT = 'lint-ignore-docs-title';

export default function remarkLintDocsTitle() {
  return (tree, file) => {
    const content = tree.children.filter(
      (node) => !SKIPPED_BEFORE_TITLE.has(node.type)
    );

    if (content.some(isIgnoreComment)) {
      return;
    }

    const opening = content.find(
      (node) => !ALLOWED_BEFORE_TITLE.has(node.name)
    );

    if (!opening) {
      file.message('This page has no content.');
      return;
    }

    if (findFirstHeading(opening)?.depth !== 1) {
      file.message(
        'A page must open with a level 1 heading, after its front matter and imports.',
        opening
      );
    }
  };
}

function isIgnoreComment(node) {
  const isComment = node.type === 'mdxFlowExpression' || node.type === 'html';

  return isComment && node.value.includes(IGNORE_COMMENT);
}

function findFirstHeading(node) {
  if (node.type === 'heading') {
    return node;
  }

  for (const child of node.children ?? []) {
    const heading = findFirstHeading(child);

    if (heading) {
      return heading;
    }
  }

  return undefined;
}
