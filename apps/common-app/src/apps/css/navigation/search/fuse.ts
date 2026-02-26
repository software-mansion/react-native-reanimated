import type { FuseResult, IFuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';

import type { LabelType } from '@/apps/css/components';
import { animationRoutes, transitionRoutes } from '@/apps/css/examples';

import type { Route, Routes } from '../types';

export type SearchDoc = {
  key: string; // route key
  name: string;
  breadcrumb: string; // created from screen names
  path: Array<string>; // segments of the path (from route keys)
  node: Route; // original object from the routes tree
  labelTypes?: Array<LabelType>;
};

function flattenRoutes(
  routes: Routes,
  keys: Array<string> = [],
  names: Array<string> = []
): Array<SearchDoc> {
  return Object.entries(routes).flatMap(([k, r]) => {
    const nameSegments = [...names, r.name];
    const pathSegments = [...keys, k];

    if (r.displayed === false) {
      return [];
    }

    return 'routes' in r
      ? flattenRoutes(r.routes, pathSegments, nameSegments)
      : [
          {
            breadcrumb: nameSegments.join('/'),
            key: pathSegments.join('/'),
            labelTypes: r.labelTypes,
            name: r.name,
            node: r,
            path: pathSegments,
          },
        ];
  });
}

export const ROUTES = {
  Animations: {
    name: 'Animations',
    routes: animationRoutes,
  },
  Transitions: {
    name: 'Transitions',
    routes: transitionRoutes,
  },
};

const SEARCH_DOCS = flattenRoutes(ROUTES);

const options = {
  ignoreDiacritics: true,
  ignoreLocation: true,
  includeMatches: true,
  includeScore: true,
  isCaseSensitive: false,
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'breadcrumb', weight: 0.3 },
  ],
  minMatchCharLength: 1,
  threshold: 0.3,
} satisfies IFuseOptions<SearchDoc>;

export const fuse = new Fuse(
  SEARCH_DOCS,
  options,
  Fuse.createIndex(options.keys, SEARCH_DOCS)
);

export function searchRoutes(q: string): Array<FuseResult<SearchDoc>> {
  if (!q.trim()) return [];
  return fuse.search(q);
}
