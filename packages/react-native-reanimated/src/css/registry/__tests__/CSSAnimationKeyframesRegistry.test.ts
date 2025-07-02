'use strict';
import { CSSKeyframesRuleImpl } from '../../models';
import {
  registerCSSKeyframes,
  unregisterCSSKeyframes,
} from '../../platform/native';
import cssKeyframesRegistry from '../CSSKeyframesRegistry';

jest.mock('../../platform/native/native.ts', () => ({
  registerCSSKeyframes: jest.fn(),
  unregisterCSSKeyframes: jest.fn(),
}));

describe('CSSKeyframesRegistry', () => {
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

  beforeEach(() => {
    cssKeyframesRegistry.clear();
    jest.clearAllMocks();
  });

  describe('add', () => {
    it('calls registerCSSKeyframes when adding a new animation', () => {
      cssKeyframesRegistry.add(keyframesRule1, viewTag1);

      expect(registerCSSKeyframes).toHaveBeenCalledTimes(1);
      expect(registerCSSKeyframes).toHaveBeenCalledWith(
        keyframesRule1.name,
        keyframesRule1.normalizedKeyframesConfig
      );
      expect(unregisterCSSKeyframes).not.toHaveBeenCalled();
    });

    it('does not call registerCSSKeyframes when adding an existing animation', () => {
      cssKeyframesRegistry.add(keyframesRule1, viewTag1);
      cssKeyframesRegistry.add(keyframesRule1, viewTag2); // animation won't be registered again, even though the viewTag is different

      expect(registerCSSKeyframes).toHaveBeenCalledTimes(1);
      expect(registerCSSKeyframes).toHaveBeenCalledWith(
        keyframesRule1.name,
        keyframesRule1.normalizedKeyframesConfig
      );
      expect(unregisterCSSKeyframes).not.toHaveBeenCalled();
    });

    it('calls registerCSSKeyframes for the new animation added', () => {
      cssKeyframesRegistry.add(keyframesRule1, viewTag1);
      cssKeyframesRegistry.add(keyframesRule2, viewTag1); // viewTag can be the same, animations aren't added separately for different views

      expect(registerCSSKeyframes).toHaveBeenCalledTimes(2);
      expect(registerCSSKeyframes).toHaveBeenNthCalledWith(
        1,
        keyframesRule1.name,
        keyframesRule1.normalizedKeyframesConfig
      );
      expect(registerCSSKeyframes).toHaveBeenNthCalledWith(
        2,
        keyframesRule2.name,
        keyframesRule2.normalizedKeyframesConfig
      );
      expect(unregisterCSSKeyframes).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('calls unregisterCSSKeyframes when removed animation is used only by a single view', () => {
      cssKeyframesRegistry.add(keyframesRule1, viewTag1);
      cssKeyframesRegistry.remove(keyframesRule1.name, viewTag1);

      expect(unregisterCSSKeyframes).toHaveBeenCalledTimes(1);
      expect(unregisterCSSKeyframes).toHaveBeenCalledWith(keyframesRule1.name);
    });

    it('does not call unregisterCSSKeyframes when viewTag is not found', () => {
      cssKeyframesRegistry.add(keyframesRule1, viewTag1);
      cssKeyframesRegistry.remove(keyframesRule1.name, viewTag2); // even though the animation is used only by a single view, it's not removed

      expect(unregisterCSSKeyframes).not.toHaveBeenCalled();
    });

    it('does not call unregisterCSSKeyframes until removed for the last view that uses it', () => {
      cssKeyframesRegistry.add(keyframesRule1, viewTag1);
      cssKeyframesRegistry.add(keyframesRule1, viewTag2);
      cssKeyframesRegistry.add(keyframesRule1, viewTag3);

      expect(unregisterCSSKeyframes).toHaveBeenCalledTimes(0);

      cssKeyframesRegistry.remove(keyframesRule1.name, viewTag1);
      expect(unregisterCSSKeyframes).toHaveBeenCalledTimes(0);

      cssKeyframesRegistry.remove(keyframesRule1.name, viewTag2);
      expect(unregisterCSSKeyframes).toHaveBeenCalledTimes(0);

      cssKeyframesRegistry.remove(keyframesRule1.name, viewTag3);
      expect(unregisterCSSKeyframes).toHaveBeenCalledTimes(1); // Finally, the animation is removed
    });
  });
});
