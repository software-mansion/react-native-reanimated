'use strict';
export * from './config';
export { default as createPropsBuilder } from './createPropsBuilder';
export * from './processors';
export { type NativePropsBuilder, stylePropsBuilder } from './propsBuilder';
export * from './registry';
// `AllStyleProps` is intentionally not re-exported — it is internal to the
// props builder and consumed by the configs directly via `./types`.
export type { PropsBuilderConfig } from './types';
