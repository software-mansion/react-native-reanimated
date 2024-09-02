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
