import type * as babel from '@babel/core';

declare function workletsPluginOxcBabelShim(
  babelApi: typeof babel
): babel.PluginObj;

export = workletsPluginOxcBabelShim;
