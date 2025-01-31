/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-var */
'use strict';

// This file works by accident - currently Builder Bob doesn't move `.d.ts` files to output types.
// If it ever breaks, we should address it so we'd not pollute the user's global namespace.
import type { WorkletsModuleProxy } from './WorkletsModule';

declare global {
  var __workletsCache: Map<string, any>;
  var __handleCache: WeakMap<object, any>;
  var evalWithSourceMap:
    | ((js: string, sourceURL: string, sourceMap: string) => any)
    | undefined;
  var evalWithSourceUrl: ((js: string, sourceURL: string) => any) | undefined;
  var _toString: (value: unknown) => string;
  var __workletsModuleProxy: WorkletsModuleProxy | undefined;
}
