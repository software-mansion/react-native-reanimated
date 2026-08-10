'use strict';
import type StaticFeatureFlagsJSON from './staticFlags.json';

/**
 * Default static feature flag values. Mirrors `staticFlags.json` (the native
 * source of truth) and is the value source on web, where the native module
 * backing `getStaticFeatureFlag` isn't available.
 *
 * Kept in its own module so it can be read from `JSReanimated` without
 * importing `featureFlags/index`, which would create a require cycle through
 * `ReanimatedModule`.
 */
export const DefaultStaticFeatureFlags = {
  RUNTIME_TEST_FLAG: false,
  DISABLE_COMMIT_PAUSING_MECHANISM: false,
  ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: false,
  IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS: false,
  EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS: true,
  IOS_CSS_CORE_ANIMATION: false,
  USE_SYNCHRONIZABLE_FOR_MUTABLES: true,
  USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS: true,
  ENABLE_SHARED_ELEMENT_TRANSITIONS: false,
  FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS: true,
  USE_ANIMATION_BACKEND: false,
} as const satisfies typeof StaticFeatureFlagsJSON;

export type StaticFeatureFlagsSchema = {
  -readonly [K in keyof typeof DefaultStaticFeatureFlags]: boolean;
};
