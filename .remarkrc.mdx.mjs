import remarkFrontmatter from 'remark-frontmatter';
import remarkMdx from 'remark-mdx';

import { settings } from './.remarkrc.mjs';

export default {
  settings,
  plugins: [remarkFrontmatter, [remarkMdx, { tightSelfClosing: true }]],
};
