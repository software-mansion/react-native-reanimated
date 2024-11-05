import { transformSync } from '@babel/core';
import type { PluginItem, TransformOptions } from '@babel/core';

export function workletTransformSync(
  code: string,
  opts: WorkletTransformOptions
) {
  const { extraPlugins = [], extraPresets = [], ...rest } = opts;

  return transformSync(code, {
    ...rest,
    plugins: [...plugins, ...extraPlugins],
    presets: [...presets, ...extraPresets],
  });
}

const presets = [require.resolve('@babel/preset-typescript')];

const plugins = [
  require.resolve('@babel/plugin-transform-shorthand-properties'),
  require.resolve('@babel/plugin-transform-arrow-functions'),
  require.resolve('@babel/plugin-transform-optional-chaining'),
  require.resolve('@babel/plugin-transform-nullish-coalescing-operator'),
  [
    require.resolve('@babel/plugin-transform-template-literals'),
    { loose: true },
  ],
];

interface WorkletTransformOptions
  extends Omit<TransformOptions, 'plugins' | 'presets'> {
  extraPlugins?: PluginItem[];
  extraPresets?: PluginItem[];
}
