'use strict';
import type { ViewProps } from 'react-native';

// Web has no Shared Element Transitions. Also, Next.js SSR cannot call
// `codegenNativeComponent`, so web must not import the native component.
export default function REASharedTransitionBoundary({
  children,
}: ViewProps & { isActive: boolean }) {
  return children;
}
