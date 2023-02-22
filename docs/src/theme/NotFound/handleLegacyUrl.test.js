import { handleLegacyUrl } from './handleLegacyUrl';

// prettier-ignore
describe('handleLegacyUrl()', () => {
  it('should resolve legacy versions to current version', () => {
    expect(handleLegacyUrl('/react-native-reanimated/docs/2.3.x/api/animations/cancelAnimation')).toBe('/react-native-reanimated/docs/api/animations/cancelAnimation');
    expect(handleLegacyUrl('/react-native-reanimated/docs/2.0.x/events')).toBe('/react-native-reanimated/docs/fundamentals/events');
    expect(handleLegacyUrl('/react-native-reanimated/docs/2.1.x/api/useAnimatedRef')).toBe('/react-native-reanimated/docs/api/hooks/useAnimatedRef');
  });

  it('should correctly resolve legacy fundamentals url', () => {
    expect(handleLegacyUrl('/react-native-reanimated/docs/2.1.x/installation')).toBe('/react-native-reanimated/docs/fundamentals/installation');
    expect(handleLegacyUrl('/react-native-reanimated/docs/2.1.x/troubleshooting')).toBe('/react-native-reanimated/docs/fundamentals/troubleshooting');
  });

  it('should correctly resolve animations url', () => {
    expect(handleLegacyUrl('/react-native-reanimated/docs/2.0.x/api/withTiming')).toBe('/react-native-reanimated/docs/api/animations/withTiming');
  });

  it('should resolve version 1.x.x to 1.x', () => {
    expect(handleLegacyUrl('/react-native-reanimated/docs/1.x.x/getting_started')).toBe('/react-native-reanimated/docs/1.x/getting_started');
    expect(handleLegacyUrl('/react-native-reanimated/docs/1.x.x/animations/timing')).toBe('/react-native-reanimated/docs/1.x/animations/timing');
    expect(handleLegacyUrl('/react-native-reanimated/docs/1.x.x/nodes/startClock')).toBe('/react-native-reanimated/docs/1.x/nodes/startClock');
  });

  it('should not have an effect on correct v1 docs', () => {
    expect(handleLegacyUrl('/react-native-reanimated/docs/1.x/getting_started')).toBe(null);
    expect(handleLegacyUrl('/react-native-reanimated/docs/1.x/animations/timing')).toBe(null);
    expect(handleLegacyUrl('/react-native-reanimated/docs/1.x/nodes/startClock')).toBe(null);
  });

  it('should not have an effect on current docs', () => {
    expect(handleLegacyUrl('/react-native-reanimated/docs/fundamentals/architecture')).toBe(null);
    expect(handleLegacyUrl('/react-native-reanimated/docs/fundamentals/animations')).toBe(null);
    expect(handleLegacyUrl('/react-native-reanimated/docs/api/LayoutAnimations/customAnimations')).toBe(null);
    expect(handleLegacyUrl('/react-native-reanimated/docs/api/nativeMethods/measure')).toBe(null);
    expect(handleLegacyUrl('/react-native-reanimated/docs/api/hooks/useAnimatedGestureHandler')).toBe(null);
  });

  it('should handle anchors to headers', () => {
    expect(handleLegacyUrl('react-native-reanimated/docs/api/useAnimatedProps#example')).toBe(null);
    expect(handleLegacyUrl('/react-native-reanimated/docs/2.0.x/api/useAnimatedReaction#arguments')).toBe('/react-native-reanimated/docs/api/hooks/useAnimatedReaction#arguments');
  });
});
