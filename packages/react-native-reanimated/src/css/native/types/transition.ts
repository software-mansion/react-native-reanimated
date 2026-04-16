'use strict';
import type { NormalizedCSSTimingFunction } from '../../easing';

export type NormalizedSingleCSSTransitionSettings = {
  duration: number;
  timingFunction: NormalizedCSSTimingFunction;
  delay: number;
  allowDiscrete: boolean;
};

export type CSSTransitionConfig = Record<
  string,
  (NormalizedSingleCSSTransitionSettings & { value: [unknown, unknown] }) | null
>;

/**
 * `specificProperties`
 *
 * - `undefined`: accept all props (equivalent to `transition-property: all`)
 * - `Set<string>`: accept only props present in the set
 *
 * `settings`
 *
 * - Keys are prop names, plus an optional `all` fallback key
 * - How to read it for a prop `propName`:
 *
 *   - Primary: `settings[propName]` (if present)
 *   - Fallback: `settings.all` (otherwise)
 */
export type NormalizedCSSTransitionConfig = {
  specificProperties: Set<string> | undefined;
  settings: Record<string, NormalizedSingleCSSTransitionSettings>;
};
