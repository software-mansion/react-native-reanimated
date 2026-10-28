import React, { useState } from 'react';
import { DocSearch } from '@docsearch/react';
import Link from '@docusaurus/Link';
import { useHistory, useLocation } from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  useDocsVersionCandidates,
  useVersions,
} from '@docusaurus/plugin-content-docs/client';
import {
  searchParameters,
  resultVersion,
  resultUrl,
  uniqueResults,
} from '@site/plugins/search/utils';
import '@docsearch/react/style';
import './styles.css';

export default function SearchBar() {
  const { siteConfig, i18n } = useDocusaurusContext();
  const versions = useVersions('default');
  const [candidate] = useDocsVersionCandidates('default');
  const location = useLocation();
  const history = useHistory();
  const [searchSession, setSearchSession] = useState(0);
  const requestedVersion = new URLSearchParams(location.search).get('version');
  const version =
    versions.find((item) => item.name === requestedVersion) ?? candidate;
  const { appId, apiKey, indexName } = siteConfig.themeConfig.algolia;

  return (
    <DocSearch
      key={`${version.name}:${location.pathname}:${location.search}:${searchSession}`}
      appId={appId}
      apiKey={apiKey}
      indexName={indexName}
      placeholder="Search docs"
      translations={{
        button: { buttonText: 'Search', buttonAriaLabel: 'Search' },
      }}
      searchParameters={searchParameters(version, i18n.currentLocale)}
      navigator={{ navigate: ({ itemUrl }) => history.push(itemUrl) }}
      transformItems={(items) =>
        uniqueResults(items).map((item) => ({
          ...item,
          url: resultUrl(item.url, siteConfig.baseUrl),
        }))
      }
      hitComponent={({ hit, children }) => {
        const label = resultVersion(hit, versions);
        return (
          <Link
            className="worklets-search-hit"
            to={resultUrl(hit.url, siteConfig.baseUrl)}>
            {children}
            {label && <span className="worklets-search-version">{label}</span>}
          </Link>
        );
      }}
      resultsFooterComponent={({ state }) => (
        <Link
          onClick={() => setSearchSession((value) => value + 1)}
          to={`${siteConfig.baseUrl}search?${new URLSearchParams({
            q: state.query,
            version: version.name,
          })}`}>
          See all {state.context.nbHits} results
        </Link>
      )}
    />
  );
}
