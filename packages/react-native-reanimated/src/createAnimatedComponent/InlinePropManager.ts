'use strict';
import type { StyleProps } from '../commonTypes';
import { isSharedValue } from '../isSharedValue';
import { startMapper, stopMapper } from '../mappers';
import { updateProps } from '../updateProps';
import type { ViewDescriptorsSet } from '../ViewDescriptorsSet';
import { makeViewDescriptorsSet } from '../ViewDescriptorsSet';
import type {
  AnimatedComponentProps,
  AnimatedComponentTypeInternal,
  IInlinePropManager,
  ViewInfo,
} from './commonTypes';
import { flattenArray } from './utils';

function isInlineStyleTransform(transform: unknown): boolean {
  if (!Array.isArray(transform)) {
    return false;
  }

  return transform.some((t: Record<string, unknown>) => hasInlineStyles(t));
}

function areInlineValuesEqual(value1: unknown, value2: unknown): boolean {
  if (Array.isArray(value1) && Array.isArray(value2)) {
    // Arrays (e.g. mixed children of <Animated.Text>) are recreated on each
    // render, so we compare their elements instead of the array identity.
    return (
      value1.length === value2.length &&
      value1.every((element, index) => element === value2[index])
    );
  }
  return value1 === value2;
}

function inlinePropsHasChanged(
  styles1: StyleProps,
  styles2: StyleProps
): boolean {
  if (Object.keys(styles1).length !== Object.keys(styles2).length) {
    return true;
  }

  for (const key of Object.keys(styles1)) {
    if (!areInlineValuesEqual(styles1[key], styles2[key])) {
      return true;
    }
  }

  return false;
}

function getInlinePropsUpdate(styleValue: StyleProps): unknown {
  'worklet';
  if (isSharedValue(styleValue)) {
    return styleValue.value;
  }
  if (Array.isArray(styleValue)) {
    return styleValue.map(getInlinePropsUpdate);
  }
  if (styleValue && typeof styleValue === 'object') {
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(styleValue)) {
      update[key] = getInlinePropsUpdate(value);
    }
    return update;
  }
  return styleValue;
}

function extractSharedValuesMapFromProps(
  props: AnimatedComponentProps<
    Record<string, unknown> /* Initial component props */
  >
): {
  inlineStyles: Record<string, unknown>;
  inlineProps: Record<string, unknown>;
} {
  // Values extracted from the `style` prop are style properties and must be
  // processed with the style props builder, while shared values passed as
  // top-level props (e.g. `text` on Animated.Text) can be arbitrary component
  // props and must skip it, hence we keep them in two separate maps.
  const inlineStyles: Record<string, unknown> = {};
  const inlineProps: Record<string, unknown> = {};

  for (const key in props) {
    const value = props[key];
    if (key === 'style') {
      const styles = flattenArray<StyleProps>(props.style ?? []);
      styles.forEach((style) => {
        if (!style) {
          return;
        }
        if (__DEV__ && '_requiresAnimatedComponent' in style) {
          return;
        }
        for (const [styleKey, styleValue] of Object.entries(style)) {
          if (isSharedValue(styleValue)) {
            inlineStyles[styleKey] = styleValue;
          } else if (
            styleKey === 'transform' &&
            isInlineStyleTransform(styleValue)
          ) {
            inlineStyles[styleKey] = styleValue;
          }
        }
      });
    } else if (isSharedValue(value)) {
      inlineProps[key] = value;
    }
  }

  return { inlineStyles, inlineProps };
}

export function hasInlineStyles(style: StyleProps): boolean {
  if (!style) {
    return false;
  }
  return Object.keys(style).some((key) => {
    const styleValue = style[key];
    return (
      isSharedValue(styleValue) ||
      (key === 'transform' && isInlineStyleTransform(styleValue))
    );
  });
}

export function getInlineStyle(
  style: Record<string, unknown>,
  isFirstRender: boolean
) {
  if (isFirstRender) {
    return getInlinePropsUpdate(style) as Record<string, unknown>;
  }
  const newStyle: StyleProps = {};
  for (const [key, styleValue] of Object.entries(style)) {
    if (
      !isSharedValue(styleValue) &&
      !(key === 'transform' && isInlineStyleTransform(styleValue))
    ) {
      newStyle[key] = styleValue;
    }
  }
  return newStyle;
}

export class InlinePropManager implements IInlinePropManager {
  _inlinePropsViewDescriptors: ViewDescriptorsSet | null = null;
  _inlinePropsMapperId: number | null = null;
  _inlineStyles: StyleProps = {};
  _inlineProps: StyleProps = {};

  public attachInlineProps(
    animatedComponent: AnimatedComponentTypeInternal,
    viewInfo: ViewInfo
  ) {
    const { inlineStyles: newInlineStyles, inlineProps: newInlineProps } =
      extractSharedValuesMapFromProps(animatedComponent.props);

    if (animatedComponent.ChildComponent.displayName === 'Text') {
      const children = (animatedComponent.props as { children?: unknown })
        .children;
      delete newInlineProps.children;
      if (isSharedValue(children)) {
        // A shared value passed as children of <Animated.Text> animates the
        // text content like the `text` prop, so we send its updates as `text`.
        newInlineProps.text = children;
      } else if (Array.isArray(children) && children.some(isSharedValue)) {
        // Mixed children (e.g. <Animated.Text>Before {sv} After</Animated.Text>)
        // are joined into a single `text` update in the updater function.
        newInlineProps.text = children;
      }
    }

    const hasChanged =
      inlinePropsHasChanged(newInlineStyles, this._inlineStyles) ||
      inlinePropsHasChanged(newInlineProps, this._inlineProps);

    if (hasChanged) {
      if (!this._inlinePropsViewDescriptors) {
        this._inlinePropsViewDescriptors = makeViewDescriptorsSet();

        const { viewTag, shadowNodeWrapper } = viewInfo;

        this._inlinePropsViewDescriptors.add({
          tag: viewTag as number,
          shadowNodeWrapper: shadowNodeWrapper!,
        });
      }
      const shareableViewDescriptors =
        this._inlinePropsViewDescriptors.shareableViewDescriptors;

      const hasInlineStyleUpdates = Object.keys(newInlineStyles).length > 0;
      const hasInlinePropUpdates = Object.keys(newInlineProps).length > 0;

      const updaterFunction = () => {
        'worklet';
        if (hasInlineStyleUpdates) {
          updateProps(
            shareableViewDescriptors,
            getInlinePropsUpdate(newInlineStyles) as StyleProps
          );
        }
        if (hasInlinePropUpdates) {
          const propsUpdate = getInlinePropsUpdate(
            newInlineProps
          ) as StyleProps;
          if (Array.isArray(propsUpdate.text)) {
            // Mixed children of <Animated.Text> - join the static parts with
            // the current values of the shared values into a single string
            propsUpdate.text = propsUpdate.text.join('');
          }
          // Pass `isAnimatedProps` so that non-style props (e.g. `text` on
          // Animated.Text) are not dropped by the style props builder.
          updateProps(shareableViewDescriptors, propsUpdate, true);
        }
      };
      this._inlineStyles = newInlineStyles;
      this._inlineProps = newInlineProps;
      if (this._inlinePropsMapperId) {
        stopMapper(this._inlinePropsMapperId);
      }
      this._inlinePropsMapperId = null;
      if (hasInlineStyleUpdates || hasInlinePropUpdates) {
        this._inlinePropsMapperId = startMapper(updaterFunction, [
          ...Object.values(newInlineStyles),
          ...Object.values(newInlineProps),
        ]);
      }
    }
  }

  public detachInlineProps() {
    if (this._inlinePropsMapperId) {
      stopMapper(this._inlinePropsMapperId);
    }
  }
}
