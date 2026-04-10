import remarkFrontmatter from 'remark-frontmatter';

export const settings = {
  bullet: '-',
  emphasis: '_',
  strong: '*',
  fence: '`',
  fences: true,
  incrementListMarker: false,
  listItemIndent: 'one',
  quote: "'",
  resourceLink: true,
  rule: '-',
  setext: false,
  closeAtx: false,
  tightDefinitions: false,
};

export default {
  settings,
  plugins: [remarkFrontmatter],
};
