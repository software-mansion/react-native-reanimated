import type { IAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';

// Registry to map component tags to component instances
const componentRegistry = new Map<
  number | HTMLElement,
  IAnimatedComponentInternal
>();

export const ComponentRegistry = {
  // Register a component instance with its tag
  register: (
    tag: number | HTMLElement,
    component: IAnimatedComponentInternal
  ) => {
    componentRegistry.set(tag, component);
  },

  // Unregister a component
  unregister: (tag: number | HTMLElement) => {
    componentRegistry.delete(tag);
  },

  // Get a component for a tag
  getComponent: (
    tag: number | HTMLElement
  ): IAnimatedComponentInternal | undefined => {
    return componentRegistry.get(tag);
  },
};
