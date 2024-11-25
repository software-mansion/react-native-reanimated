import { transformSync } from '@babel/core';
import type { PluginItem, TransformOptions } from '@babel/core';

export function workletTransformSync(
  code: string,
  opts: WorkletTransformOptions
) {
  const { extraPlugins = [], extraPresets = [], ...rest } = opts;

  return transformSync(code, {
    ...rest,
    plugins: [...defaultPlugins, ...extraPlugins],
    presets: [...defaultPresets, ...extraPresets],
  });
}

const defaultPresets: PluginItem[] = [
  require.resolve('@babel/preset-typescript'),
];

const defaultPlugins: PluginItem[] = [];

interface WorkletTransformOptions
  extends Omit<TransformOptions, 'plugins' | 'presets'> {
  extraPlugins?: PluginItem[];
  extraPresets?: PluginItem[];
  filename: TransformOptions['filename'];
}
