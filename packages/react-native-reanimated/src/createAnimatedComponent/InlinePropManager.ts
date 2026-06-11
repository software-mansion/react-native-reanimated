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

function inlinePropsHasChanged(
  styles1: StyleProps,
  styles2: StyleProps
): boolean {
  if (Object.keys(styles1).length !== Object.keys(styles2).length) {
    return true;
  }

  for (const key of Object.keys(styles1)) {
    if (styles1[key] !== styles2[key]) {
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
          // Pass `isAnimatedProps` so that non-style props (e.g. `text` on
          // Animated.Text) are not dropped by the style props builder.
          updateProps(
            shareableViewDescriptors,
            getInlinePropsUpdate(newInlineProps) as StyleProps,
            true
          );
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
