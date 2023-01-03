/* global _updatePropsPaper _updatePropsFabric */
import { MutableRefObject } from 'react';
import { processColor } from './Colors';
import { AnimatedStyle, SharedValue, StyleProps } from './commonTypes';
import { makeShareable, isConfigured } from './core';
import { Descriptor } from './hook/commonTypes';
import { _updatePropsJS } from './js-reanimated';
import { shouldBeUseWeb } from './PlatformChecker';
import { ViewRefSet } from './ViewDescriptorsSet';

// copied from react-native/Libraries/Components/View/ReactNativeStyleAttributes
export const colorProps = [
  'backgroundColor',
  'borderBottomColor',
  'borderColor',
  'borderLeftColor',
  'borderRightColor',
  'borderTopColor',
  'borderStartColor',
  'borderEndColor',
  'color',
  'shadowColor',
  'textDecorationColor',
  'tintColor',
  'textShadowColor',
  'overlayColor',
];

export const ColorProperties = !isConfigured() ? [] : makeShareable(colorProps);

const uiPropsSet = Object.keys({
  opacity: true,
  transform: true,
  /* colors */
  backgroundColor: true,
  borderRightColor: true,
  borderBottomColor: true,
  borderColor: true,
  borderEndColor: true,
  borderLeftColor: true,
  borderStartColor: true,
  borderTopColor: true,
  /* ios styles */
  shadowOpacity: true,
  shadowRadius: true,
  /* legacy android transform properties */
  scaleX: true,
  scaleY: true,
  translateX: true,
  translateY: true,
});

const nativePropsSet = Object.keys({
  borderBottomWidth: true,
  borderEndWidth: true,
  borderLeftWidth: true,
  borderRightWidth: true,
  borderStartWidth: true,
  borderTopWidth: true,
  borderWidth: true,
  bottom: true,
  flex: true,
  flexGrow: true,
  flexShrink: true,
  height: true,
  left: true,
  margin: true,
  marginBottom: true,
  marginEnd: true,
  marginHorizontal: true,
  marginLeft: true,
  marginRight: true,
  marginStart: true,
  marginTop: true,
  marginVertical: true,
  maxHeight: true,
  maxWidth: true,
  minHeight: true,
  minWidth: true,
  padding: true,
  paddingBottom: true,
  paddingEnd: true,
  paddingHorizontal: true,
  paddingLeft: true,
  paddingRight: true,
  paddingStart: true,
  paddingTop: true,
  paddingVertical: true,
  right: true,
  start: true,
  top: true,
  width: true,
  zIndex: true,
  borderBottomEndRadius: true,
  borderBottomLeftRadius: true,
  borderBottomRightRadius: true,
  borderBottomStartRadius: true,
  borderRadius: true,
  borderTopEndRadius: true,
  borderTopLeftRadius: true,
  borderTopRightRadius: true,
  borderTopStartRadius: true,
  elevation: true,
  fontSize: true,
  lineHeight: true,
  textShadowRadius: true,
  letterSpacing: true,
  /* strings */
  display: true,
  backfaceVisibility: true,
  overflow: true,
  resizeMode: true,
  fontStyle: true,
  fontWeight: true,
  textAlign: true,
  textDecorationLine: true,
  fontFamily: true,
  textAlignVertical: true,
  fontVariant: true,
  textDecorationStyle: true,
  textTransform: true,
  writingDirection: true,
  /* text color */
  color: true,
  tintColor: true,
  shadowColor: true,
  placeholderTextColor: true,
});

let uiPropUpdates: Record<number, StyleProps | AnimatedStyle> = {}; // tag -> props
const uiPropUpdatesCount: { count: number } = { count: 0 };

function updateUiPropsPaperBatched(
  tag: number,
  _name: string,
  updates: StyleProps | AnimatedStyle
) {
  'worklet';
  uiPropUpdates[tag] = updates;
  ++uiPropUpdatesCount.count;
  if (uiPropUpdatesCount.count === 1) {
    global.setImmediate(() => {
      'worklet';
      _updateUiPropsPaper(uiPropUpdates);
      uiPropUpdates = {};
      uiPropUpdatesCount.count = 0;
    });
  }
}

let updatePropsByPlatform;
if (shouldBeUseWeb()) {
  updatePropsByPlatform = (
    _: SharedValue<Descriptor[]>,
    updates: StyleProps | AnimatedStyle,
    maybeViewRef: ViewRefSet<any> | undefined
  ): void => {
    'worklet';
    if (maybeViewRef) {
      maybeViewRef.items.forEach((item, _) => {
        _updatePropsJS(updates, item);
      });
    }
  };
} else {
  if (global._IS_FABRIC) {
    updatePropsByPlatform = (
      viewDescriptors: SharedValue<Descriptor[]>,
      updates: StyleProps | AnimatedStyle,
      _: ViewRefSet<any> | undefined
    ): void => {
      'worklet';

      for (const key in updates) {
        if (ColorProperties.indexOf(key) !== -1) {
          updates[key] = processColor(updates[key]);
        }
      }

      viewDescriptors.value.forEach((viewDescriptor) => {
        _updatePropsFabric(viewDescriptor.shadowNodeWrapper, updates);
      });
    };
  } else {
    updatePropsByPlatform = (
      viewDescriptors: SharedValue<Descriptor[]>,
      updates: StyleProps | AnimatedStyle,
      _: ViewRefSet<any> | undefined
    ): void => {
      'worklet';

      // if (_WORKLET) _beginSection('UpdateProps processColor');
      for (const key in updates) {
        if (ColorProperties.indexOf(key) !== -1) {
          // if (_WORKLET) _beginSection('processColor');
          updates[key] = processColor(updates[key]);
          // if (_WORKLET) _endSection();
        }
      }
      // if (_WORKLET) _endSection();

      // if (_WORKLET) _beginSection('check props');
      let hasNativeProps = false;
      let hasJsProps = false;
      for (const key of Object.keys(updates)) {
        if (uiPropsSet.includes(key)) {
          // do nothing
        } else if (nativePropsSet.includes(key)) {
          hasNativeProps = true;
        } else {
          hasJsProps = true;
        }
      }
      // if (_WORKLET) _endSection();

      let nativeUpdatePropsFunction: typeof _updatePropsPaper;
      if (!hasNativeProps && !hasJsProps) {
        // only UI props
        nativeUpdatePropsFunction = updateUiPropsPaperBatched;
      } else if (!hasJsProps) {
        // only UI or native props
        nativeUpdatePropsFunction = _updateNativePropsPaper;
      } else {
        // has JS props, use general implementation
        nativeUpdatePropsFunction = _updatePropsPaper;
      }

      viewDescriptors.value.forEach((viewDescriptor) => {
        nativeUpdatePropsFunction(
          viewDescriptor.tag,
          viewDescriptor.name || 'RCTView',
          updates
        );
      });
    };
  }
}

export const updateProps: (
  viewDescriptor: SharedValue<Descriptor[]>,
  updates: StyleProps | AnimatedStyle,
  maybeViewRef: ViewRefSet<any> | undefined
) => void = updatePropsByPlatform;

export const updatePropsJestWrapper = (
  viewDescriptors: SharedValue<Descriptor[]>,
  updates: AnimatedStyle,
  maybeViewRef: ViewRefSet<any> | undefined,
  animatedStyle: MutableRefObject<AnimatedStyle>,
  adapters: ((updates: AnimatedStyle) => void)[]
): void => {
  adapters.forEach((adapter) => {
    adapter(updates);
  });
  animatedStyle.current.value = {
    ...animatedStyle.current.value,
    ...updates,
  };

  updateProps(viewDescriptors, updates, maybeViewRef);
};

export default updateProps;
