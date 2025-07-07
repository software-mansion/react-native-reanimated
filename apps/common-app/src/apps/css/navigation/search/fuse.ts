import type { IFuseOptions } from 'fuse.js';
import Fuse from 'fuse.js';

import { animationRoutes, transitionRoutes } from '@/apps/css/examples';

import type { Route, Routes } from '../types';

export interface SearchDoc {
  key: string;
  name: string;
  breadcrumb: string; // full path
  segments: Array<string>; // segments of the path
  node: Route; // original object from the routes tree
}

function flattenRoutes(
  routes: Routes,
  keys: Array<string> = [],
  names: Array<string> = []
): Array<SearchDoc> {
  return Object.entries(routes).flatMap(([k, r]) => {
    const segments = [...names, r.name];
    return 'routes' in r
      ? flattenRoutes(r.routes, [...keys, k], [...names, r.name])
      : [
          {
            key: [...keys, k].join('.'),
            name: r.name,
            breadcrumb: segments.join(' / '),
            segments,
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
