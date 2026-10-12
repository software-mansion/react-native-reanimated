import { render } from '@testing-library/react-native';
import type { ReactNode, Ref } from 'react';
import { useContext, useEffect, useImperativeHandle, useState } from 'react';
import { View } from 'react-native';

import { LayoutAnimationConfig } from '../src';
import { SkipEnteringContext } from '../src/component/LayoutAnimationConfig';

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

describe('LayoutAnimationConfig skipEntering', () => {
  const childMounts: boolean[] = [];

  function ReadsSkipEntering() {
    const skipEnteringRef = useContext(SkipEnteringContext);
    const [skippedEntering] = useState(() => skipEnteringRef?.current === true);
    useEffect(() => {
      childMounts.push(skippedEntering);
    }, [skippedEntering]);
    return <View />;
  }

  beforeEach(() => {
    childMounts.length = 0;
  });

  test('left out, it keeps the skipped entering of an outer LayoutAnimationConfig', () => {
    render(
      <LayoutAnimationConfig skipEntering>
        <LayoutAnimationConfig>
          <ReadsSkipEntering />
        </LayoutAnimationConfig>
      </LayoutAnimationConfig>
    );

    expect(childMounts).toEqual([true]);
  });

  test.each([
    [undefined, true],
    [undefined, false],
    [true, undefined],
    [false, undefined],
  ])('changing it from %s to %s keeps the children mounted', (from, to) => {
    const { rerender } = render(
      <LayoutAnimationConfig skipEntering={from}>
        <ReadsSkipEntering />
      </LayoutAnimationConfig>
    );

    rerender(
      <LayoutAnimationConfig skipEntering={to}>
        <ReadsSkipEntering />
      </LayoutAnimationConfig>
    );

    expect(childMounts).toHaveLength(1);
  });
});

describe('LayoutAnimationConfig skipExiting', () => {
  const childMounts = jest.fn();

  function CountsMounts({ tag }: { tag: number }) {
    useEffect(() => {
      childMounts(tag);
    }, [tag]);
    return <ForwardsHostInstance tag={tag} />;
  }

  beforeEach(() => {
    childMounts.mockClear();
    setShouldAnimateExitingForTag.mockClear();
  });

  test.each([
    [undefined, true],
    [false, true],
    [true, undefined],
    [true, false],
  ])(
    'changing it from %s to %s keeps multiple children mounted',
    (from, to) => {
      const { rerender } = render(
        <LayoutAnimationConfig skipExiting={from}>
          <CountsMounts tag={42} />
          <CountsMounts tag={43} />
        </LayoutAnimationConfig>
      );

      rerender(
        <LayoutAnimationConfig skipExiting={to}>
          <CountsMounts tag={42} />
          <CountsMounts tag={43} />
        </LayoutAnimationConfig>
      );

      expect(childMounts).toHaveBeenCalledTimes(2);
    }
  );

  test.each([undefined, false])(
    '%s leaves the exiting of multiple children alone on unmount',
    (skipExiting) => {
      const { unmount } = render(
        <LayoutAnimationConfig skipExiting={skipExiting}>
          <CountsMounts tag={42} />
          <CountsMounts tag={43} />
        </LayoutAnimationConfig>
      );

      unmount();

      expect(setShouldAnimateExitingForTag).not.toHaveBeenCalled();
    }
  );
});
