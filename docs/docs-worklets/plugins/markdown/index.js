const fs = require('node:fs/promises');
const path = require('node:path');
const {
  DEFAULT_PARSE_FRONT_MATTER,
  admonitionTitleToDirectiveLabel,
  parseMarkdownFile,
} = require('@docusaurus/utils');

const ADMONITIONS = ['note', 'tip', 'info', 'warning', 'danger', 'caution'];

async function createConverter() {
  const [unified, parse, mdx, stringify, gfm, directive] = await Promise.all([
    import('unified'),
    import('remark-parse'),
    import('remark-mdx'),
    import('remark-stringify'),
    import('remark-gfm'),
    import('remark-directive'),
  ]);
  // Reuse the browser's normalization without executing a simulation module.
  const { unregister } = require('esbuild-register/dist/node').register();
  const { displaySource } = require('../../src/simulation/display');
  unregister();

  const processor = unified
    .unified()
    .use(parse.default)
    .use(mdx.default)
    .use(gfm.default)
    .use(directive.default)
    .use(stringify.default);

  return async function convert({
    filePath,
    permalink,
    siteUrl,
    baseUrl,
    sourcePermalinks = new Map(),
  }) {
    const { content } = await parseMarkdownFile({
      filePath,
      fileContent: await fs.readFile(filePath, 'utf8'),
      parseFrontMatter: DEFAULT_PARSE_FRONT_MATTER,
      removeContentTitle: false,
    });
    const tree = processor.parse(
      admonitionTitleToDirectiveLabel(content, ADMONITIONS)
    );
    const sources = new Map();
    for (const node of tree.children) {
      for (const statement of node.data?.estree?.body ?? []) {
        if (
          statement.type === 'ImportDeclaration' &&
          statement.source.value.startsWith('!!raw-loader!')
        ) {
          const sourcePath = statement.source.value.slice(
            '!!raw-loader!'.length
          );
          for (const specifier of statement.specifiers) {
            sources.set(specifier.local.name, sourcePath);
          }
        }
      }
    }

    async function codeFor(expression) {
      const sourcePath = sources.get(expression?.name);
      if (!sourcePath) {
        throw new Error(`Missing simulation source in ${filePath}`);
      }
      const resolved = require.resolve(
        path.resolve(path.dirname(filePath), sourcePath)
      );
      const source = await fs.readFile(resolved, 'utf8');
      return {
        type: 'code',
        lang: 'js',
        value: displaySource(source, { boilerplate: true }).text.trimEnd(),
      };
    }

    function absoluteUrl(url) {
      // Resolve source-file links the same way as the rendered docs, including
      // numeric filename prefixes and frontmatter slugs.
      const [, pathname, suffix] = url.match(/^([^?#]*)(.*)$/);
      const linkedDoc = sourcePermalinks.get(
        path.resolve(path.dirname(filePath), pathname)
      );
      if (linkedDoc) return new URL(`${linkedDoc}${suffix}`, siteUrl).href;
      // Docusaurus applies baseUrl to /docs and /img links in MDX. Do the same
      // in copied Markdown, which may be read outside the documentation site.
      const target =
        url.startsWith('/') && !url.startsWith('//') && !url.startsWith(baseUrl)
          ? `${baseUrl.replace(/\/$/, '')}${url}`
          : url;
      return new URL(target, new URL(permalink, siteUrl)).href;
    }

    async function transform(node) {
      if (node.type === 'mdxjsEsm' || node.type === 'html') return [];
      if (
        node.type === 'mdxFlowExpression' ||
        node.type === 'mdxTextExpression'
      ) {
        const value = literal(node.data?.estree?.body[0]?.expression);
        return typeof value === 'string' ? [{ type: 'text', value }] : [];
      }
      if (
        node.type === 'mdxJsxFlowElement' ||
        node.type === 'mdxJsxTextElement'
      ) {
        if (node.name === 'ThreadingSimulation') {
          return [await codeFor(attributeExpression(node, 'source'))];
        }
        if (node.name === 'ThreadingShowcase') {
          const variants = [];
          for (const [name, label] of [
            ['single', 'Without Worklets'],
            ['worklets', 'With Worklets'],
          ]) {
            const expression = attributeExpression(node, name);
            const source = expression?.properties?.find(
              (property) => property.key.name === 'source'
            )?.value;
            variants.push(paragraph(label), await codeFor(source));
          }
          return variants;
        }
        if (node.name === 'PlatformTable') {
          return [
            table([
              ['Native', 'Web'],
              [
                supported(attribute(node, 'native')),
                supported(attribute(node, 'web')),
              ],
            ]),
          ];
        }
        if (node.name === 'CallTable') {
          return [
            table([
              ['Mode', 'RN Runtime', 'UI Runtime', 'Worker Runtime'],
              ...[
                ['bundleMode', 'Bundle Mode'],
                ['noBundleMode', 'Legacy Eval Mode'],
              ].map(([name, label]) => {
                const row = attribute(node, name);
                return [
                  label,
                  ...['rnRuntime', 'uiRuntime', 'workerRuntime'].map((key) =>
                    supported(row[key])
                  ),
                ];
              }),
            ]),
          ];
        }
        if (node.name === 'DeprecatedBanner') {
          return [paragraph(attribute(node, 'text') ?? 'Deprecated API.')];
        }
        const children = (
          await Promise.all((node.children ?? []).map(transform))
        ).flat();
        if (node.name === 'TabItem') {
          return [
            paragraph(attribute(node, 'label') ?? attribute(node, 'value')),
            ...children,
          ];
        }
        return children;
      }
      if (node.children) {
        node.children = (
          await Promise.all(node.children.map(transform))
        ).flat();
      }
      if (node.type === 'containerDirective') {
        return [
          {
            type: 'blockquote',
            children: [paragraph(node.name.toUpperCase()), ...node.children],
          },
        ];
      }
      if (node.url) node.url = absoluteUrl(node.url);
      return [node];
    }

    await transform(tree);
    return processor.stringify(tree);
  };
}

function attributeExpression(node, name) {
  return node.attributes.find((item) => item.name === name)?.value?.data?.estree
    ?.body[0]?.expression;
}

function attribute(node, name) {
  const value = node.attributes.find((item) => item.name === name)?.value;
  return typeof value === 'string'
    ? value
    : literal(attributeExpression(node, name));
}

// Read static MDX props only; never evaluate a page's JavaScript expressions.
function literal(expression) {
  if (expression?.type === 'Literal') return expression.value;
  if (expression?.type === 'ObjectExpression') {
    return Object.fromEntries(
      expression.properties.map((property) => [
        property.key.name,
        literal(property.value),
      ])
    );
  }
  return undefined;
}

function paragraph(value) {
  return { type: 'paragraph', children: [{ type: 'text', value }] };
}

function supported(value) {
  return value ? 'Supported' : 'Not supported';
}

function table(rows) {
  return {
    type: 'table',
    children: rows.map((row) => ({
      type: 'tableRow',
      children: row.map((value) => ({
        type: 'tableCell',
        children: [{ type: 'text', value }],
      })),
    })),
  };
}

function markdownPaths(permalink, baseUrl) {
  const relative = permalink.slice(baseUrl.length);
  // The theme requests `${permalink}.md`; also accept the URL without a
  // trailing slash when the site's trailingSlash setting changes.
  return [...new Set([`${relative}.md`, `${relative.replace(/\/$/, '')}.md`])];
}

async function markdownPlugin(context) {
  const convert = await createConverter();
  const directory = path.join(context.generatedFilesDir, 'worklets-markdown');
  return {
    name: 'worklets-markdown',
    getPathsToWatch() {
      return [
        path.join(context.siteDir, 'docs/**/*.{md,mdx,js,jsx}'),
        path.join(context.siteDir, 'versioned_docs/**/*.{md,mdx}'),
      ];
    },
    async allContentLoaded({ allContent }) {
      const { url: siteUrl, baseUrl, title } = context.siteConfig;
      const docs = Object.values(
        allContent['docusaurus-plugin-content-docs'] ?? {}
      )
        .flatMap((content) => content.loadedVersions)
        .flatMap((version) => version.docs)
        .filter((doc) => !doc.draft);
      const sourcePermalinks = new Map(
        docs.map((doc) => [
          path.join(context.siteDir, doc.source.replace(/^@site\//, '')),
          doc.permalink,
        ])
      );
      await fs.rm(directory, { recursive: true, force: true });
      await fs.mkdir(directory, { recursive: true });
      const index = [`# ${title}`, ''];
      const full = [`# ${title}`, ''];
      for (const doc of docs) {
        const filePath = path.join(
          context.siteDir,
          doc.source.replace(/^@site\//, '')
        );
        const markdown = await convert({
          filePath,
          permalink: doc.permalink,
          siteUrl,
          baseUrl,
          sourcePermalinks,
        });
        for (const relative of markdownPaths(doc.permalink, baseUrl)) {
          const target = path.join(directory, relative);
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target, markdown);
        }
        // Keep the discovery index focused on the current docs. Versioned pages
        // still get exports, so their Copy page actions match their content.
        if (doc.version === 'current' && !doc.unlisted) {
          const url = new URL(doc.permalink, siteUrl).href;
          index.push(`- [${doc.title}](${url})`);
          full.push(`---\n\n# ${doc.title}\n\nSource: ${url}\n\n${markdown}`);
        }
      }
      await fs.writeFile(
        path.join(directory, 'llms.txt'),
        index.join('\n') + '\n'
      );
      await fs.writeFile(
        path.join(directory, 'llms-full.txt'),
        full.join('\n') + '\n'
      );
    },
    configureWebpack() {
      return {
        devServer: {
          static: [
            {
              directory,
              publicPath: context.siteConfig.baseUrl,
              // Copy page requests /docs/.md for the landing page.
              staticOptions: { dotfiles: 'allow' },
              watch: false,
            },
          ],
        },
      };
    },
    async postBuild({ outDir }) {
      await fs.cp(directory, outDir, { recursive: true });
    },
  };
}

module.exports = markdownPlugin;
module.exports.createConverter = createConverter;
module.exports.markdownPaths = markdownPaths;
