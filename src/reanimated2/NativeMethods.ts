import type { MeasuredDimensions, ShadowNodeWrapper } from './commonTypes';
import {
  isChromeDebugger,
  isJest,
  isWeb,
  shouldBeUseWeb,
} from './PlatformChecker';

import type { AnimatedRef } from './hook/commonTypes';
import type { Component } from 'react';

const IS_NATIVE = !shouldBeUseWeb();

export let measure: <T extends Component>(
  animatedRef: AnimatedRef<T>
) => MeasuredDimensions | null;

if (isWeb()) {
  measure = (animatedRef) => {
    const element = (animatedRef as any)() as HTMLElement; // TODO: fix typing of animated refs on web
    const viewportOffset = element.getBoundingClientRect();
    return {
      width: element.offsetWidth,
      height: element.offsetHeight,
      x: element.offsetLeft,
      y: element.offsetTop,
      pageX: viewportOffset.left,
      pageY: viewportOffset.top,
    };
  };
} else if (isChromeDebugger()) {
  measure = () => {
    console.warn('[Reanimated] measure() cannot be used with Chrome Debugger.');
    return null;
  };
} else if (isJest()) {
  measure = () => {
    console.warn('[Reanimated] measure() cannot be used with Jest.');
    return null;
  };
} else if (IS_NATIVE) {
  measure = (animatedRef) => {
    'worklet';
    if (!_WORKLET) {
      return null;
    }

    const viewTag = (animatedRef as any)();
    if (viewTag === -1) {
      console.warn(
        `[Reanimated] The view with tag ${viewTag} is not a valid argument for measure(). This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).`
      );
      return null;
    }

    const measured = _IS_FABRIC
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        _measureFabric!(viewTag as ShadowNodeWrapper)
      : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        _measurePaper!(viewTag as number);
    if (measured === null) {
      console.warn(
        `[Reanimated] The view with tag ${viewTag} has some undefined, not-yet-computed or meaningless value of \`LayoutMetrics\` type. This may be because the view is not currently rendered, which may not be a bug (e.g. an off-screen FlatList item).`
      );
      return null;
    } else if (measured.x === -1234567) {
      console.warn(
        `[Reanimated] The view with tag ${viewTag} returned an invalid measurement response.`
      );
      return null;
    } else if (isNaN(measured.x)) {
      console.warn(
        `[Reanimated] The view with tag ${viewTag} gets view-flattened on Android. To disable view-flattening, set \`collapsable={false}\` on this component.`
      );
      return null;
    } else {
      return measured;
    }
  };
} else {
  measure = () => {
    console.warn(
      '[Reanimated] measure() is not supported on this configuration.'
    );
    return null;
  };
}

export let dispatchCommand: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  commandName: string,
  args?: Array<unknown>
) => void;

if (IS_NATIVE && global._IS_FABRIC) {
  dispatchCommand = (animatedRef, commandName, args = []) => {
    'worklet';
    if (!_WORKLET) {
      return;
    }

    const shadowNodeWrapper = animatedRef() as ShadowNodeWrapper;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    _dispatchCommandFabric!(shadowNodeWrapper, commandName, args);
  };
} else if (IS_NATIVE) {
  dispatchCommand = (animatedRef, commandName, args = []) => {
    'worklet';
    if (!_WORKLET) {
      return;
    }

    const viewTag = animatedRef() as number;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    _dispatchCommandPaper!(viewTag, commandName, args);
  };
} else if (isWeb()) {
  dispatchCommand = () => {
    console.warn('[Reanimated] dispatchCommand() is not supported on web.');
  };
} else if (isChromeDebugger()) {
  dispatchCommand = () => {
    console.warn(
      '[Reanimated] dispatchCommand() is not supported with Chrome Debugger.'
    );
  };
} else if (isJest()) {
  dispatchCommand = () => {
    console.warn('[Reanimated] dispatchCommand() is not supported with Jest.');
  };
} else {
  dispatchCommand = () => {
    console.warn(
      '[Reanimated] dispatchCommand() is not supported on this configuration.'
    );
  };
}

export let scrollTo: <T extends Component>(
  animatedRef: AnimatedRef<T>,
  x: number,
  y: number,
  animated: boolean
) => void;

if (isWeb()) {
  scrollTo = (animatedRef, x, y, animated) => {
    'worklet';
    const element = (animatedRef as any)() as HTMLElement; // TODO: fix typing of animated refs on web
    // @ts-ignore same call as in react-native-web
    element.scrollTo({ x, y, animated });
  };
} else if (IS_NATIVE && global._IS_FABRIC) {
  scrollTo = (animatedRef, x, y, animated) => {
    'worklet';
    dispatchCommand(animatedRef as any, 'scrollTo', [x, y, animated]);
  };
} else if (IS_NATIVE) {
  scrollTo = (animatedRef, x, y, animated) => {
    'worklet';
    if (!_WORKLET) {
      return;
    }

    // Calling animatedRef on Paper returns a number (nativeTag)
    const viewTag = (animatedRef as any)() as number;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    _scrollToPaper!(viewTag, x, y, animated);
  };
} else if (isChromeDebugger()) {
  scrollTo = () => {
    console.warn(
      '[Reanimated] scrollTo() is not supported with Chrome Debugger.'
    );
  };
} else if (isJest()) {
  scrollTo = () => {
    console.warn('[Reanimated] scrollTo() is not supported with Jest.');
  };
} else {
  scrollTo = () => {
    console.warn(
      '[Reanimated] scrollTo() is not supported on this configuration.'
    );
  };
}

export let setGestureState: (handlerTag: number, newState: number) => void;

if (IS_NATIVE) {
  setGestureState = (handlerTag, newState) => {
    'worklet';
    if (!_WORKLET) {
      console.warn(
        '[Reanimated] You can not use setGestureState in non-worklet function.'
      );
      return;
    }
    _setGestureState(handlerTag, newState);
  };
} else if (isWeb()) {
  setGestureState = () => {
    console.warn('[Reanimated] setGestureState() is not available on web.');
  };
} else if (isChromeDebugger()) {
  setGestureState = () => {
    console.warn(
      '[Reanimated] setGestureState() cannot be used with Chrome Debugger.'
    );
  };
} else if (isJest()) {
  setGestureState = () => {
    console.warn('[Reanimated] setGestureState() cannot be used with Jest.');
  };
} else {
  setGestureState = () => {
    console.warn(
      '[Reanimated] setGestureState() is not supported on this configuration.'
    );
  };
}
