'use strict';

import { addWhitelistedNativeProps } from "./ConfigHelper.js";

// @ts-expect-error This overload is required by our API.

export function createAnimatedPropAdapter(adapter, nativeProps) {
  const nativePropsToAdd = {};
  nativeProps?.forEach(prop => {
    nativePropsToAdd[prop] = true;
  });
  addWhitelistedNativeProps(nativePropsToAdd);
  return adapter;
}
//# sourceMappingURL=PropAdapters.js.map