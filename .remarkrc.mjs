import {
  gfmTaskListItemFromMarkdown,
  gfmTaskListItemToMarkdown,
} from 'mdast-util-gfm-task-list-item';
import remarkFrontmatter from 'remark-frontmatter';
import { gfmTaskListItem } from 'micromark-extension-gfm-task-list-item';

export function remarkGfmTaskListItem() {
  const data = this.data();
  (data.micromarkExtensions ??= []).push(gfmTaskListItem());
  (data.fromMarkdownExtensions ??= []).push(gfmTaskListItemFromMarkdown());
  (data.toMarkdownExtensions ??= []).push(gfmTaskListItemToMarkdown());
}

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
  plugins: [remarkFrontmatter, remarkGfmTaskListItem],
};
