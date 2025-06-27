import React from 'react';
import NotFound from '@theme-original/NotFound';
import { Redirect, useLocation } from '@docusaurus/router';
import { mapLegacyUrl } from './mapLegacyUrl';
import { mapOldDocsToNewUrl } from './mapOldDocsToNewUrl';

export default function NotFoundWrapper(props) {
  const location = useLocation();
  const { pathname } = location;

  // Between Reanimated v2.2 and v2.3 the structure of the docs has changed
  // This redirects old links to avoid breaking legacy links
  const legacyRedirect = mapLegacyUrl(pathname);

  if (legacyRedirect) {
    return <Redirect to={legacyRedirect} />;
  }

  const newDocsRedirect = mapOldDocsToNewUrl(pathname);

  if (newDocsRedirect) {
    return <Redirect to={newDocsRedirect} />;
  }

  return <NotFound {...props} />;
}
