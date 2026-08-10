'use strict';

export type HostInstance = {
  __internalInstanceHandle?: Record<string, unknown>;
  __nativeTag?: number;
  __viewConfig?: Record<string, unknown>;
  // Legacy ReactFabricHostComponent key (e.g. react-native-macos).
  _viewConfig?: Record<string, unknown>;
};
