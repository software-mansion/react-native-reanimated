'use strict';

import { useEffect, useRef } from 'react';
import { makeShareable } from 'react-native-worklets';
import { isJest, isWeb } from "../PlatformChecker.js";
import { areDependenciesEqual, buildDependencies } from "./utils.js";

/**
 * Lets you find out whether the event handler dependencies have changed.
 *
 * @param handlers - An object of event handlers.
 * @param dependencies - An optional array of dependencies.
 * @returns An object containing a boolean indicating whether the dependencies
 *   have changed, and a boolean indicating whether the code is running on the
 *   web.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/advanced/useHandler
 */
// @ts-expect-error This overload is required by our API.

export function useHandler(handlers, dependencies) {
  const initRef = useRef(null);
  if (initRef.current === null) {
    const context = makeShareable({});
    initRef.current = {
      context,
      savedDependencies: []
    };
  }
  useEffect(() => {
    return () => {
      initRef.current = null;
    };
  }, []);
  const {
    context,
    savedDependencies
  } = initRef.current;
  dependencies = buildDependencies(dependencies, handlers);
  const doDependenciesDiffer = !areDependenciesEqual(dependencies, savedDependencies);
  initRef.current.savedDependencies = dependencies;
  const useWeb = isWeb() || isJest();
  return {
    context,
    doDependenciesDiffer,
    useWeb
  };
}
//# sourceMappingURL=useHandler.js.map