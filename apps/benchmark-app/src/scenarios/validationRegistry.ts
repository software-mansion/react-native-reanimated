import {
  CrosscheckLoad,
  findCrosscheckLoadUnmetRequirement,
} from './CrosscheckLoad';
import type { Scenario } from './registry';

export const validationScenarios: readonly Scenario[] = [
  {
    name: 'crosscheck-load',
    version: 1,
    load: 100,
    Component: CrosscheckLoad,
    findUnmetRequirement: findCrosscheckLoadUnmetRequirement,
  },
];
