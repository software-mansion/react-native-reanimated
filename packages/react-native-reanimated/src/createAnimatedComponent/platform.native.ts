'use strict';

/**
 * React-native-svg hit-tests a shape only once a responder prop marked it
 * responsible, and accepts any truthy one. Returning false makes the shape
 * hit-testable without ever claiming the responder from its ancestors.
 */
export const svgHitTestResponder: (() => boolean) | undefined = () => false;
