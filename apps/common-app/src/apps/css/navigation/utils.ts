import type { Route, Routes, RouteWithRoutes, TabRoute } from './types';

export function isRouteWithRoutes(route: Route): route is RouteWithRoutes {
  return route && typeof route === 'object' && 'routes' in route;
}

// Collects the navigation paths of all leaf example screens (routes that render
// a component rather than a nested list), keyed for O(1) worklet lookup. Used to
// tell apart final example screens from the navigation list screens. The path
// prefix matches the focused route name set in the navigator (`<tab>/<...keys>`).
export function getExampleScreenPaths(
  tabRoutes: Array<TabRoute>
): Record<string, true> {
  const paths: Record<string, true> = {};

  const collect = (routes: Routes, prefix: string) => {
    for (const [key, route] of Object.entries(routes)) {
      const path = `${prefix}/${key}`;
      if (isRouteWithRoutes(route)) {
        collect(route.routes, path);
      } else {
        paths[path] = true;
      }
    }
  };

  for (const tab of tabRoutes) {
    collect(tab.routes, tab.name);
  }

  return paths;
}

const isUpperCase = (char: string) => char && char === char.toUpperCase();

export function getScreenTitle(path: string): string {
  const parts = path.split('/');
  const lastPart = parts[parts.length - 1] ?? '';
  const words = [];

  let firstWordCharIdx = 0;
  for (let i = 1; i < lastPart.length; i++) {
    const char = lastPart[i];
    if (isUpperCase(char) && !isUpperCase(lastPart[i + 1])) {
      words.push(lastPart.slice(firstWordCharIdx, i));
      firstWordCharIdx = i;
    }
  }

  words.push(lastPart.slice(firstWordCharIdx));

  return words.join(' ');
}
