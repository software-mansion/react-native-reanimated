import remarkFrontmatter from 'remark-frontmatter';
import remarkMdx from 'remark-mdx';

import { settings, remarkGfmTaskListItem } from './.remarkrc.mjs';

export default {
  settings,
  plugins: [
    remarkFrontmatter,
    remarkGfmTaskListItem,
    [remarkMdx, { tightSelfClosing: true }],
  ],
};
