import remarkFrontmatter from 'remark-frontmatter';
import remarkMdx from 'remark-mdx';

import remarkLintDocsTitle from './scripts/remark-lint-docs-title.mjs';

export default {
  plugins: [remarkFrontmatter, remarkMdx, remarkLintDocsTitle],
};
