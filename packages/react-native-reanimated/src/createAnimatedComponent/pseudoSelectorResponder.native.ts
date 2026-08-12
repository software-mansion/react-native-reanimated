'use strict';

// react-native-svg hit-tests a shape only once a responder prop marked it
// responsible, and accepts any truthy one. False claims nothing.
const neverClaimResponder = () => false;

/**
 * Makes react-native-svg shapes hit-testable, so their pseudo selectors receive
 * presses at all. Inert on every other component.
 */
export function addPseudoSelectorResponder(props: Record<string, unknown>) {
  if (!props.onStartShouldSetResponder) {
    props.onStartShouldSetResponder = neverClaimResponder;
  }
}
