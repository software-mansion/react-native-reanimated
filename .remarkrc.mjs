import remarkFrontmatter from 'remark-frontmatter';

const config = {
  settings: {
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
  },
  plugins: [remarkFrontmatter],
};

export default config;
