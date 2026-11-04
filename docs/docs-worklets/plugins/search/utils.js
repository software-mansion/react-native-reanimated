// The production crawler currently uses the visible version label (0.13),
// while Docusaurus emits the internal name (current). Accept either spelling
// so filtering continues to work after the next crawl, without mixing versions.
function searchParameters(version, language) {
  const tags = [...new Set([version.name, version.label])].map(
    (name) => `docusaurus_tag:docs-default-${name}`
  );
  return {
    facetFilters: [`language:${language}`, ['docusaurus_tag:default', ...tags]],
    attributesToRetrieve: [
      'hierarchy',
      'content',
      'url',
      'url_without_anchor',
      'type',
      'version',
      'docusaurus_tag',
    ],
  };
}

function resultVersion(hit, versions) {
  const path = new URL(hit.url, 'https://docs.swmansion.com').pathname;
  // Archived paths identify versions even for saved hits without metadata.
  const archived = versions.find(
    (version) =>
      version.name !== 'current' && path.includes(`/docs/${version.name}/`)
  );
  if (archived) return archived.label;
  const labels = Array.isArray(hit.version) ? hit.version : [hit.version];
  const indexed = versions.find(
    (version) => labels.includes(version.label) || labels.includes(version.name)
  );
  if (indexed) return indexed.label;
  return path.includes('/docs/')
    ? versions.find((version) => version.name === 'current')?.label
    : undefined;
}

function resultUrl(url, baseUrl) {
  const parsed = new URL(url, 'https://docs.swmansion.com');
  // The same production index is used by local and /react-native-worklets-next/ previews.
  const pathname = parsed.pathname.replace(
    /^\/react-native-worklets(?:-next)?\//,
    baseUrl
  );
  return `${pathname}${parsed.search}${parsed.hash}`;
}

function uniqueResults(hits) {
  const seen = new Set();
  return hits.filter((hit) => {
    const url = new URL(hit.url, 'https://docs.swmansion.com');
    const key = `${url.pathname.replace(/\/$/, '')}${url.search}${url.hash}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Some indexed headings already contain highlight markup. Render it as text,
// without interpreting HTML or stripping type parameters such as <TValue>.
function resultText(value = '') {
  return value
    .replace(/<\/?(?:span|mark|code|em|strong|b|i)\b[^>]*>/gi, '')
    .replace(/\u200b/g, '');
}

module.exports = {
  searchParameters,
  resultVersion,
  resultUrl,
  uniqueResults,
  resultText,
};
