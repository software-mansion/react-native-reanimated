import React from 'react';
import NotFound from '@theme-original/NotFound';
import { Redirect, useLocation } from '@docusaurus/router';

const redirects = [
  {
    from: '/docs/1.x.x',
    to: '/docs/1.x',
  },
  {
    from: '/docs/2.0.x',
    to: '/docs',
  },
  {
    from: '/docs/2.1.x',
    to: '/docs',
  },
  {
    from: '/docs/2.2.x',
    to: '/docs',
  },
  {
    from: '/docs/2.3.x',
    to: '/docs',
  },
];

export default function NotFoundWrapper(props) {
  const location = useLocation();
  const { pathname } = location;

  const findRedirect = redirects.find(({ from }) => pathname.match(from));

  const redirectTo = findRedirect
    ? pathname.replace(findRedirect.from, findRedirect.to)
    : null;

  if (redirectTo) {
    return <Redirect to={redirectTo} />;
  }

  return <NotFound {...props} />;
}
