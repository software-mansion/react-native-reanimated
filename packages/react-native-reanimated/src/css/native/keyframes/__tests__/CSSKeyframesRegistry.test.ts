'use strict';
import { registerCSSKeyframes, unregisterCSSKeyframes } from '../../proxy';
import cssKeyframesRegistry from '../CSSKeyframesRegistry';
import CSSKeyframesRuleImpl from '../CSSKeyframesRuleImpl';

const VIEW_NAME = 'RCTView'; // Must be a valid view name
const JS_COMPONENT_NAME = 'View';

jest.mock('../../proxy.ts', () => ({
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
    test('calls registerCSSKeyframes when adding a new animation', () => {
      cssKeyframesRegistry.add(
        keyframesRule1,
        viewTag1,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );

      const keyframesConfig = keyframesRule1.getNormalizedKeyframesConfig(
        VIEW_NAME,
        JS_COMPONENT_NAME
      );

      expect(registerCSSKeyframes).toHaveBeenCalledTimes(1);
      expect(registerCSSKeyframes).toHaveBeenCalledWith(
        keyframesRule1.name,
        VIEW_NAME,
        JS_COMPONENT_NAME,
        keyframesConfig
      );
      expect(unregisterCSSKeyframes).not.toHaveBeenCalled();
    });

    test('does not call registerCSSKeyframes when adding an existing animation', () => {
      cssKeyframesRegistry.add(
        keyframesRule1,
        viewTag1,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );
      cssKeyframesRegistry.add(
        keyframesRule1,
        viewTag2,
        VIEW_NAME,
        JS_COMPONENT_NAME
      ); // animation won't be registered again, even though the viewTag is different

      const keyframesConfig = keyframesRule1.getNormalizedKeyframesConfig(
        VIEW_NAME,
        JS_COMPONENT_NAME
      );

      expect(registerCSSKeyframes).toHaveBeenCalledTimes(1);
      expect(registerCSSKeyframes).toHaveBeenCalledWith(
        keyframesRule1.name,
        VIEW_NAME,
        JS_COMPONENT_NAME,
        keyframesConfig
      );
      expect(unregisterCSSKeyframes).not.toHaveBeenCalled();
    });

    test('calls registerCSSKeyframes for the new animation added', () => {
      cssKeyframesRegistry.add(
        keyframesRule1,
        viewTag1,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );
      cssKeyframesRegistry.add(
        keyframesRule2,
        viewTag1,
        VIEW_NAME,
        JS_COMPONENT_NAME
      ); // viewTag can be the same, animations aren't added separately for different views

      const keyframesConfig1 = keyframesRule1.getNormalizedKeyframesConfig(
        VIEW_NAME,
        JS_COMPONENT_NAME
      );
      const keyframesConfig2 = keyframesRule2.getNormalizedKeyframesConfig(
        VIEW_NAME,
        JS_COMPONENT_NAME
      );

      expect(registerCSSKeyframes).toHaveBeenCalledTimes(2);
      expect(registerCSSKeyframes).toHaveBeenNthCalledWith(
        1,
        keyframesRule1.name,
        VIEW_NAME,
        JS_COMPONENT_NAME,
        keyframesConfig1
      );
      expect(registerCSSKeyframes).toHaveBeenNthCalledWith(
        2,
        keyframesRule2.name,
        VIEW_NAME,
        JS_COMPONENT_NAME,
        keyframesConfig2
      );
      expect(unregisterCSSKeyframes).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    test('calls unregisterCSSKeyframes when removed animation is used only by a single view', () => {
      cssKeyframesRegistry.add(
        keyframesRule1,
        viewTag1,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );
      cssKeyframesRegistry.remove(
        keyframesRule1.name,
        viewTag1,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );

      expect(unregisterCSSKeyframes).toHaveBeenCalledTimes(1);
      expect(unregisterCSSKeyframes).toHaveBeenCalledWith(
        keyframesRule1.name,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );
    });

    test('does not call unregisterCSSKeyframes when viewTag is not found', () => {
      cssKeyframesRegistry.add(
        keyframesRule1,
        viewTag1,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );
      cssKeyframesRegistry.remove(
        keyframesRule1.name,
        viewTag2,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );

      expect(unregisterCSSKeyframes).not.toHaveBeenCalled();
    });

    test('does not call unregisterCSSKeyframes until removed for the last view that uses it', () => {
      cssKeyframesRegistry.add(
        keyframesRule1,
        viewTag1,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );
      cssKeyframesRegistry.add(
        keyframesRule1,
        viewTag2,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );
      cssKeyframesRegistry.add(
        keyframesRule1,
        viewTag3,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );

      expect(unregisterCSSKeyframes).toHaveBeenCalledTimes(0);

      cssKeyframesRegistry.remove(
        keyframesRule1.name,
        viewTag1,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );
      expect(unregisterCSSKeyframes).toHaveBeenCalledTimes(0);

      cssKeyframesRegistry.remove(
        keyframesRule1.name,
        viewTag2,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );
      expect(unregisterCSSKeyframes).toHaveBeenCalledTimes(0);

      cssKeyframesRegistry.remove(
        keyframesRule1.name,
        viewTag3,
        VIEW_NAME,
        JS_COMPONENT_NAME
      );
      expect(unregisterCSSKeyframes).toHaveBeenCalledTimes(1); // Finally, the animation is removed
    });
  });
});
