import React from 'react';
import NotFound from '@theme-original/NotFound';
import { Redirect, useLocation } from '@docusaurus/router';
import { handleLegacyUrl } from './handleLegacyUrl';

export default function NotFoundWrapper(props) {
  const location = useLocation();
  const { pathname } = location;

  // Between Reanimated v2.2 and v2.3 the structure of the docs has changed
  // This redirects old links to avoid breaking legacy links
  const redirect = handleLegacyUrl(pathname);

  if (redirect) {
    return <Redirect to={redirect} />;
  }

  return <NotFound {...props} />;
}
