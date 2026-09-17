'use strict';

// Some native components only act on a prop, or pass it down to their
// children, when they received it as a plain prop in JS. A CSS animation or
// pseudo state writes to the shadow node directly, so a prop it is the only
// source of has to reach the component inline as well, at its resting value.
const PROP_DEFAULTS = new Map<string, unknown>();

export function registerPropDefaults(
  defaults: Record<string, NonNullable<unknown>>
) {
  for (const prop in defaults) {
    PROP_DEFAULTS.set(prop, defaults[prop]);
  }
}

export function hasRegisteredPropDefaults(): boolean {
  return PROP_DEFAULTS.size > 0;
}

export function hasRegisteredPropDefault(prop: string): boolean {
  return PROP_DEFAULTS.has(prop);
}

export function getRegisteredPropDefault(prop: string): unknown {
  return PROP_DEFAULTS.get(prop);
}
