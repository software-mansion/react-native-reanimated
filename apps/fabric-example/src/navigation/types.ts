import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { RouteCardComponent } from '../components';

export type Route = {
  name: string;
  CardComponent?: RouteCardComponent;
} & (
  | {
      routes: Routes;
    }
  | { Component: React.ComponentType }
);

export type Routes = Record<string, Route>;

export type TabRoute = {
  name: string;
  icon: IconDefinition;
  routes: Routes;
};

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}/${P}`
    : never
  : never;

export type RouteNames<P extends string, T extends Routes> =
  | P
  | Join<P, keyof T>
  | {
      [K in keyof T]: T[K] extends { routes: Routes }
        ? RouteNames<Join<P, K>, T[K]['routes']>
        : never;
    }[keyof T];
