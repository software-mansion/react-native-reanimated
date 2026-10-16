import { act } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

import { useAnimatedHinge } from '../src';
import { ReanimatedModule } from '../src/ReanimatedModule';

describe('useAnimatedHinge', () => {
  test('hydrates the server markup, then reports the hinge of the device', () => {
    jest.spyOn(ReanimatedModule, 'isSensorAvailable').mockReturnValue(true);
    const renders: boolean[] = [];
    function HingeAvailability() {
      const { isAvailable } = useAnimatedHinge();
      renders.push(isAvailable);
      return <span>{String(isAvailable)}</span>;
    }
    const container = document.createElement('div');
    container.innerHTML = renderToString(<HingeAvailability />);
    const onRecoverableError = jest.fn();

    expect(container.textContent).toBe('false');
    renders.length = 0;

    act(() => {
      hydrateRoot(container, <HingeAvailability />, { onRecoverableError });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(renders).toEqual([false, true]);
    expect(container.textContent).toBe('true');
  });
});
