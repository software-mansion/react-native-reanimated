import type * as ReanimatedModule from '../src';

const { SharedTransition } =
  jest.requireActual<typeof ReanimatedModule>('../src/mock');

const MODIFIERS = [
  'duration',
  'delay',
  'easing',
  'springify',
  'dampingRatio',
  'damping',
  'mass',
  'stiffness',
  'overshootClamping',
  'energyThreshold',
  'reduceMotion',
  'withCallback',
  'withInitialValues',
  'withTargetValues',
  'fadeContent',
  'custom',
  'progressAnimation',
  'defaultTransitionType',
] as const;

describe('SharedTransition in the Jest mock', () => {
  it('is a class', () => {
    expect(new SharedTransition()).toBeInstanceOf(SharedTransition);
  });

  it.each(MODIFIERS)('starts and continues a chain with %s', (modifier) => {
    const call = (builder: Record<string, unknown>) =>
      (builder[modifier] as (...args: unknown[]) => unknown)();
    const started = call(
      SharedTransition as unknown as Record<string, unknown>
    );
    expect(started).toBeInstanceOf(SharedTransition);
    expect(call(new SharedTransition() as never)).toBeInstanceOf(
      SharedTransition
    );
  });

  it('lets a test spy on a static modifier', () => {
    const spy = jest.spyOn(SharedTransition, 'duration');
    SharedTransition.duration(300);
    expect(spy).toHaveBeenCalledWith(300);
    spy.mockRestore();
  });
});
