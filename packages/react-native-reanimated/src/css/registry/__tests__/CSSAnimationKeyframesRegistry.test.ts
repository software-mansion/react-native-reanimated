'use strict';
import { CSSKeyframesRuleImpl } from '../../models';
import {
  registerCSSAnimationKeyframes,
  unregisterCSSAnimationKeyframes,
} from '../../platform/native';
import CSSAnimationKeyframesRegistry from '../CSSAnimationKeyframesRegistry';

jest.mock('../../platform/native/native.ts', () => ({
  registerCSSAnimationKeyframes: jest.fn(),
  unregisterCSSAnimationKeyframes: jest.fn(),
}));

describe(CSSAnimationKeyframesRegistry, () => {
  // each call to CSSKeyframesRuleImpl creates a new animation, thus,
  // even though the keyframes are the same, the animation name is different
  // and animations are treated as different animations
  const keyframesRule1 = new CSSKeyframesRuleImpl({
    to: { opacity: 0.5 },
  });
  const keyframesRule2 = new CSSKeyframesRuleImpl({
    to: { opacity: 0.5 },
  });
  const viewTag1 = 1;
  const viewTag2 = 2;
  const viewTag3 = 3;
  let registry: CSSAnimationKeyframesRegistry;

  beforeEach(() => {
    registry = new CSSAnimationKeyframesRegistry();
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('calls registerCSSAnimationKeyframes when adding a new animation', () => {
      registry.add(keyframesRule1, viewTag1);

      expect(registerCSSAnimationKeyframes).toHaveBeenCalledTimes(1);
      expect(registerCSSAnimationKeyframes).toHaveBeenCalledWith(
        keyframesRule1.name,
        keyframesRule1.normalizedKeyframesConfig
      );
      expect(unregisterCSSAnimationKeyframes).not.toHaveBeenCalled();
    });

    it('does not call registerCSSAnimationKeyframes when adding an existing animation', () => {
      registry.add(keyframesRule1, viewTag1);
      registry.add(keyframesRule1, viewTag2); // animation won't be registered again, even though the viewTag is different

      expect(registerCSSAnimationKeyframes).toHaveBeenCalledTimes(1);
      expect(registerCSSAnimationKeyframes).toHaveBeenCalledWith(
        keyframesRule1.name,
        keyframesRule1.normalizedKeyframesConfig
      );
      expect(unregisterCSSAnimationKeyframes).not.toHaveBeenCalled();
    });

    it('calls registerCSSAnimationKeyframes for the new animation added', () => {
      registry.add(keyframesRule1, viewTag1);
      registry.add(keyframesRule2, viewTag1); // viewTag can be the same, animations aren't added separately for different views

      expect(registerCSSAnimationKeyframes).toHaveBeenCalledTimes(2);
      expect(registerCSSAnimationKeyframes).toHaveBeenNthCalledWith(
        1,
        keyframesRule1.name,
        keyframesRule1.normalizedKeyframesConfig
      );
      expect(registerCSSAnimationKeyframes).toHaveBeenNthCalledWith(
        2,
        keyframesRule2.name,
        keyframesRule2.normalizedKeyframesConfig
      );
      expect(unregisterCSSAnimationKeyframes).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('calls unregisterCSSAnimationKeyframes when removed animation is used only by a single view', () => {
      registry.add(keyframesRule1, viewTag1);
      registry.remove(keyframesRule1.name, viewTag1);

      expect(unregisterCSSAnimationKeyframes).toHaveBeenCalledTimes(1);
      expect(unregisterCSSAnimationKeyframes).toHaveBeenCalledWith(
        keyframesRule1.name
      );
    });

    it('does not call unregisterCSSAnimationKeyframes when viewTag is not found', () => {
      registry.add(keyframesRule1, viewTag1);
      registry.remove(keyframesRule1.name, viewTag2); // even though the animation is used only by a single view, it's not removed

      expect(unregisterCSSAnimationKeyframes).not.toHaveBeenCalled();
    });

    it('does not call unregisterCSSAnimationKeyframes until removed for the last view that uses it', () => {
      registry.add(keyframesRule1, viewTag1);
      registry.add(keyframesRule1, viewTag2);
      registry.add(keyframesRule1, viewTag3);

      expect(unregisterCSSAnimationKeyframes).toHaveBeenCalledTimes(0);

      registry.remove(keyframesRule1.name, viewTag1);
      expect(unregisterCSSAnimationKeyframes).toHaveBeenCalledTimes(0);

      registry.remove(keyframesRule1.name, viewTag2);
      expect(unregisterCSSAnimationKeyframes).toHaveBeenCalledTimes(0);

      registry.remove(keyframesRule1.name, viewTag3);
      expect(unregisterCSSAnimationKeyframes).toHaveBeenCalledTimes(1); // Finally, the animation is removed
    });
  });
});
