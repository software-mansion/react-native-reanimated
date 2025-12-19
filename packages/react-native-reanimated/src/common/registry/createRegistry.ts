'use strict';
import { ReanimatedError } from '../errors';
import { isReactNativeViewName } from '../utils/guards';

export const ERROR_MESSAGES = {
  propsBuilderNotFound: (componentName: string) =>
    `CSS props builder for component ${componentName} was not found`,
};

export type PropsBuilderRegistry<TBuilder> = {
  hasPropsBuilder(componentName: string): boolean;
  getPropsBuilder(componentName: string): TBuilder;
  registerBuilder(componentName: string, builder: TBuilder): void;
};

export function createRegistry<TBuilder>({
  basePropsBuilder,
}: {
  basePropsBuilder: TBuilder;
}): PropsBuilderRegistry<TBuilder> {
  const builders: Record<string, TBuilder> = {};

  return {
    hasPropsBuilder(componentName: string): boolean {
      if (builders[componentName]) {
        return true;
      }
      if (isReactNativeViewName(componentName)) {
        return true;
      }
      return false;
    },

    getPropsBuilder(componentName: string): TBuilder {
      const builder = builders[componentName];
      if (builder) {
        return builder;
      }

      if (isReactNativeViewName(componentName)) {
        return basePropsBuilder;
      }

      throw new ReanimatedError(
        ERROR_MESSAGES.propsBuilderNotFound(componentName)
      );
    },

    registerBuilder(componentName: string, builder: TBuilder): void {
      builders[componentName] = builder;
    },
  };
}
