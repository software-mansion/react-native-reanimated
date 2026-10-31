import { act, Activity, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import Animated, {
  configureReanimatedLogger,
  ReanimatedLogLevel,
  useAnimatedStyle,
  useSharedValue,
} from '../src';

const onLog = jest.fn();
const mounts = jest.fn();

function MountProbe() {
  useEffect(() => {
    mounts();
  }, []);
  return null;
}

function Fixture({
  mode,
  hostKey,
  revision,
}: {
  mode: 'hidden' | 'visible';
  hostKey: string;
  revision: number;
}) {
  const offset = useSharedValue(17);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value + offset.value }],
  }));

  return (
    <Activity mode={mode}>
      <Animated.View key={hostKey} testID={`host-${revision}`} style={style} />
      <Animated.View key={`${hostKey}-second`} style={style} />
      <MountProbe />
    </Activity>
  );
}

test('initial styles remain warning-free across hidden Activity updates and reveal', async () => {
  const actEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  const warn = jest.spyOn(console, 'warn').mockImplementation();
  configureReanimatedLogger(
    { level: ReanimatedLogLevel.warn, strict: true },
    onLog
  );
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  try {
    for (const [hostKey, revision] of [
      ['a', 0],
      ['a', 1],
      ['b', 2],
      ['b', 3],
    ] as const) {
      await act(() =>
        Promise.resolve(
          root.render(
            <Fixture mode="hidden" hostKey={hostKey} revision={revision} />
          )
        )
      );
    }
    expect(mounts).not.toHaveBeenCalled();

    await act(() =>
      Promise.resolve(
        root.render(<Fixture mode="visible" hostKey="b" revision={4} />)
      )
    );

    expect(mounts).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector<HTMLElement>('[data-testid="host-4"]')?.style
        .transform
    ).toBe('translateY(34px)');
    expect(onLog).not.toHaveBeenCalled();
  } finally {
    await act(() => Promise.resolve(root.unmount()));
    container.remove();
    configureReanimatedLogger({});
    warn.mockRestore();
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  }
});
