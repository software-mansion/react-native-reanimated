import type { ComponentType } from 'react';

import { Css } from './Css';
import { IdleCost } from './IdleCost';
import { LayoutAnimations } from './LayoutAnimations';
import { MountUnmount } from './MountUnmount';
import {
  findSharedElementsUnmetRequirement,
  SharedElements,
} from './SharedElements';
import { StickyHeader } from './StickyHeader';
import { WorkletStylesLayout } from './WorkletStylesLayout';
import { WorkletStylesTransform } from './WorkletStylesTransform';

export interface ScenarioProps {
  load: number;
}

export interface Scenario {
  name: string;
  version: number;
  load: number;
  Component: ComponentType<ScenarioProps>;
  findUnmetRequirement?: () => string | undefined;
}

export const scenarios: readonly Scenario[] = [
  {
    name: 'worklet-styles-transform',
    version: 1,
    load: 80,
    Component: WorkletStylesTransform,
  },
  {
    name: 'worklet-styles-layout',
    version: 1,
    load: 100,
    Component: WorkletStylesLayout,
  },
  { name: 'css', version: 1, load: 60, Component: Css },
  {
    name: 'layout-animations',
    version: 1,
    load: 60,
    Component: LayoutAnimations,
  },
  { name: 'sticky-header', version: 1, load: 50, Component: StickyHeader },
  {
    name: 'shared-elements',
    version: 1,
    load: 15,
    Component: SharedElements,
    findUnmetRequirement: findSharedElementsUnmetRequirement,
  },
  { name: 'mount-unmount', version: 1, load: 40, Component: MountUnmount },
  { name: 'idle-cost', version: 3, load: 250, Component: IdleCost },
];

export function findScenario(name: string) {
  return scenarios.find((scenario) => scenario.name === name);
}
