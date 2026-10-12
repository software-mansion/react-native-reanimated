import { render } from '@testing-library/react-native';
import type { ReactNode, Ref } from 'react';
import { useImperativeHandle } from 'react';
import { View } from 'react-native';

import { LayoutAnimationConfig } from '../src';

jest.mock('../src/platformFunctions/findNodeHandle', () => ({
  findNodeHandle: jest.fn(() => 1234),
}));

jest.mock('../src/core', () => ({
  ...jest.requireActual('../src/core'),
  setShouldAnimateExitingForTag: jest.fn(),
}));

const { findNodeHandle }: { findNodeHandle: jest.Mock } = jest.requireMock(
  '../src/platformFunctions/findNodeHandle'
);

const {
  setShouldAnimateExitingForTag,
}: {
  setShouldAnimateExitingForTag: jest.Mock;
} = jest.requireMock('../src/core');

// React Native components render as class wrappers under the jest preset, so
// their refs never resolve to a host instance. These stand in for a child that
// forwards its ref all the way down to one.
function ForwardsHostInstance({
  ref,
  tag = 42,
}: {
  ref?: Ref<unknown>;
  tag?: number;
}) {
  useImperativeHandle(ref, () => ({ __nativeTag: tag }), [tag]);
  return <View />;
}

function ForwardsAnimatedComponent({ ref }: { ref?: Ref<unknown> }) {
  useImperativeHandle(ref, () => ({ getComponentViewTag: () => 7 }), []);
  return <View />;
}

function DropsRef({ children }: { children?: ReactNode }) {
  return <View>{children}</View>;
}

const renderWrapped = (children: ReactNode) =>
  render(<LayoutAnimationConfig skipExiting>{children}</LayoutAnimationConfig>);

describe('LayoutAnimationConfig view tag resolution', () => {
  beforeEach(() => {
    findNodeHandle.mockClear();
    setShouldAnimateExitingForTag.mockClear();
  });

  test('falls back to findNodeHandle when the child drops its ref', () => {
    const { unmount } = renderWrapped(<DropsRef />);

    unmount();

    expect(findNodeHandle).toHaveBeenCalled();
    expect(setShouldAnimateExitingForTag).toHaveBeenCalledWith(1234, false);
  });

  test('resolves a forwarded host instance without findNodeHandle', () => {
    const { unmount } = renderWrapped(<ForwardsHostInstance />);

    unmount();

    expect(findNodeHandle).not.toHaveBeenCalled();
    expect(setShouldAnimateExitingForTag).toHaveBeenCalledWith(42, false);
  });

  test('resolves an animated component child without findNodeHandle', () => {
    const { unmount } = renderWrapped(<ForwardsAnimatedComponent />);

    unmount();

    expect(findNodeHandle).not.toHaveBeenCalled();
    expect(setShouldAnimateExitingForTag).toHaveBeenCalledWith(7, false);
  });

  test('resolves each of multiple children without findNodeHandle', () => {
    const { unmount } = render(
      <LayoutAnimationConfig skipExiting>
        <ForwardsHostInstance tag={42} />
        <ForwardsHostInstance tag={43} />
      </LayoutAnimationConfig>
    );

    unmount();

    expect(findNodeHandle).not.toHaveBeenCalled();
    expect(setShouldAnimateExitingForTag).toHaveBeenCalledTimes(2);
    expect(setShouldAnimateExitingForTag).toHaveBeenCalledWith(42, false);
    expect(setShouldAnimateExitingForTag).toHaveBeenCalledWith(43, false);
  });

  test('supports removing a conditional child', () => {
    const { rerender } = renderWrapped(<ForwardsHostInstance />);

    expect(() =>
      rerender(
        <LayoutAnimationConfig skipExiting>{false}</LayoutAnimationConfig>
      )
    ).not.toThrow();
  });

  test('supports a single child in an array', () => {
    expect(() =>
      renderWrapped([<ForwardsHostInstance key="child" />])
    ).not.toThrow();
  });

  test('enables exiting when skipExiting is false', () => {
    const { unmount } = render(
      <LayoutAnimationConfig skipExiting={false}>
        <ForwardsHostInstance />
      </LayoutAnimationConfig>
    );

    unmount();

    expect(setShouldAnimateExitingForTag).toHaveBeenCalledWith(42, true);
  });

  test('falls back to findNodeHandle for a fragment child', () => {
    const { unmount } = renderWrapped(
      <>
        <ForwardsHostInstance />
      </>
    );

    unmount();

    expect(findNodeHandle).toHaveBeenCalled();
    expect(setShouldAnimateExitingForTag).toHaveBeenCalledWith(1234, false);
  });

  test('preserves a ref the child already had', () => {
    const childRef = jest.fn();

    const { unmount } = renderWrapped(<ForwardsHostInstance ref={childRef} />);

    expect(childRef).toHaveBeenCalledWith({ __nativeTag: 42 });

    unmount();

    expect(findNodeHandle).not.toHaveBeenCalled();
    expect(setShouldAnimateExitingForTag).toHaveBeenCalledWith(42, false);
  });
});
