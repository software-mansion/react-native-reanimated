import React, { useEffect, useMemo, useState } from 'react';
import { liteClient } from 'algoliasearch/lite';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import { useHistory, useLocation } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  useLatestVersion,
  useVersions,
} from '@docusaurus/plugin-content-docs/client';
import { PageMetadata, useSearchQueryString } from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import {
  searchParameters,
  resultUrl,
  resultVersion,
  uniqueResults,
  resultText,
} from '@site/plugins/search/utils';
import styles from './styles.module.css';

function Results({ query, version, versions }) {
  const { siteConfig, i18n } = useDocusaurusContext();
  const { appId, apiKey, indexName } = siteConfig.themeConfig.algolia;
  const client = useMemo(() => liteClient(appId, apiKey), [appId, apiKey]);
  const [page, setPage] = useState(0);
  const [results, setResults] = useState({ hits: [], nbHits: 0, nbPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const timer = setTimeout(async () => {
      try {
        const response = await client.search({
          requests: [
            {
              indexName,
              query,
              page,
              hitsPerPage: 20,
              ...searchParameters(version, i18n.currentLocale),
              attributesToHighlight: [],
              attributesToSnippet: ['content:30'],
              highlightPreTag: '',
              highlightPostTag: '',
            },
          ],
        });
        if (cancelled) return;
        const result = response.results[0];
        setResults((previous) => ({
          ...result,
          hits: uniqueResults(
            page === 0 ? result.hits : [...previous.hits, ...result.hits]
          ),
        }));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [client, indexName, query, page, version, i18n.currentLocale, attempt]);

  return (
    <>
      <p role="status" aria-live="polite">
        {loading
          ? 'Searching…'
          : error
            ? 'Search could not load. Please try again.'
            : `${results.nbHits} results`}
      </p>
      {error && (
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Retry search
        </button>
      )}
      <div aria-label="Search results" aria-busy={loading}>
        {results.hits.map((hit) => {
          const headings = Object.values(hit.hierarchy)
            .filter(Boolean)
            .map(resultText);
          const title = headings.pop();
          const label = resultVersion(hit, versions);
          const summary = hit._snippetResult?.content?.value ?? hit.content;
          return (
            <article className={styles.result} key={hit.objectID}>
              <h2>
                <Link to={resultUrl(hit.url, siteConfig.baseUrl)}>{title}</Link>
                {label && <span className={styles.version}>{label}</span>}
              </h2>
              <p className={styles.breadcrumbs}>{headings.join(' › ')}</p>
              {summary && <p>{resultText(summary)}</p>}
            </article>
          );
        })}
      </div>
      {!loading && !error && results.nbHits === 0 && (
        <p>
          No results found in this version. Try another term or documentation
          version.
        </p>
      )}
      {page + 1 < results.nbPages && !error && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setPage((value) => value + 1)}>
          Load more results
        </button>
      )}
    </>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useSearchQueryString();
  const latestVersion = useLatestVersion('default');
  const versions = useVersions('default');
  const history = useHistory();
  const location = useLocation();
  const requested = new URLSearchParams(location.search).get('version');
  const version =
    versions.find((item) => item.name === requested) ?? latestVersion;
  const title = query
    ? `Search results for "${query}"`
    : 'Search the documentation';

  return (
    <Layout>
      <PageMetadata title={title} />
      <Head>
        <meta name="robots" content="noindex, follow" />
      </Head>
      <main className={`container margin-vert--lg ${styles.page}`}>
        <h1>{title}</h1>
        <form
          className={styles.controls}
          onSubmit={(event) => event.preventDefault()}>
          <label className={styles.query}>
            Search
            <input
              type="search"
              value={query ?? ''}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type your search here"
            />
          </label>
          <label>
            Documentation version
            <select
              value={version.name}
              onChange={(event) => {
                const params = new URLSearchParams(location.search);
                params.set('version', event.target.value);
                history.replace({ ...location, search: `?${params}` });
              }}>
              {versions.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </form>
        <div className={styles.byline}>
          Search by <a href="https://www.algolia.com/">Algolia</a>
        </div>
        {query?.trim() && (
          <Results
            key={`${query}:${version.name}`}
            query={query.trim()}
            version={version}
            versions={versions}
          />
        )}
      </main>
    </Layout>
  );
}
