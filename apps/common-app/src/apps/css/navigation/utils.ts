import type { Route, RouteWithRoutes } from './types';

export function isRouteWithRoutes(route: Route): route is RouteWithRoutes {
  return 'routes' in route;
}

export function getScreenTitle(path: string): string {
  const parts = path.split('/');
  const lastPart = parts[parts.length - 1] ?? '';
  return lastPart.replace(/([A-Z])/g, ' $1').trim();
}
