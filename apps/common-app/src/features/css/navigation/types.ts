import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

import type { LabelType, RouteCardComponent } from '~/css/components';

export type Route = RouteWithComponent | RouteWithRoutes;

type SharedRouteProps = {
  name: string;
  disabled?: boolean;
  displayed?: boolean;
  labelTypes?: Array<LabelType>;
  CardComponent?: RouteCardComponent;
};

export type RouteWithRoutes = {
  flatten?: true;
  routes: Routes;
} & SharedRouteProps;

type RouteWithComponent = {
  Component: React.ComponentType;
} & SharedRouteProps;

export type Routes = Record<string, Route>;

export type TabRoute = {
  name: string;
  icon: IconDefinition;
  routes: Routes;
};

type Join<K, P> = K extends number | string
  ? P extends number | string
    ? `${K}/${P}`
    : never
  : never;

export type RouteNames<P extends string, T extends Routes> =
  | {
      [K in keyof T]: T[K] extends { routes: Routes }
        ? RouteNames<Join<P, K>, T[K]['routes']>
        : never;
    }[keyof T]
  | Join<P, keyof T>
  | P;
