import type { IFuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';

import { animationRoutes, transitionRoutes } from '@/apps/css/examples';

import type { Route, Routes } from '../types';

export interface SearchDoc {
  key: string; // route key
  name: string;
  breadcrumb: string; // created from screen names
  path: Array<string>; // segments of the path (from route keys)
  node: Route; // original object from the routes tree
}

function flattenRoutes(
  routes: Routes,
  keys: Array<string> = [],
  names: Array<string> = []
): Array<SearchDoc> {
  return Object.entries(routes).flatMap(([k, r]) => {
    const nameSegments = [...names, r.name];
    const pathSegments = [...keys, k];
    return 'routes' in r
      ? flattenRoutes(r.routes, pathSegments, nameSegments)
      : [
          {
            key: pathSegments.join('/'),
            name: r.name,
            breadcrumb: nameSegments.join(' / '),
            path: pathSegments,
            node: r,
          },
        ];
  });
}

export const DOCS = flattenRoutes({
  Animations: {
    name: 'Animations',
    routes: animationRoutes,
  },
  Transitions: {
    name: 'Transitions',
    routes: transitionRoutes,
  },
});

const options = {
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'breadcrumb', weight: 0.5 },
  ],
  threshold: 0.3,
  ignoreLocation: true,
  includeScore: true,
  isCaseSensitive: false,
  includeMatches: true,
  ignoreDiacritics: true,
  minMatchCharLength: 1,
} satisfies IFuseOptions<SearchDoc>;

export const fuse = new Fuse(
  DOCS,
  options,
  Fuse.createIndex(options.keys, DOCS)
);

export function searchRoutes(q: string): Array<SearchDoc> {
  if (!q.trim()) return [];
  return fuse.search(q).map((r) => r.item); // ranked best to worst
}
